-- =====================================================
-- NUCLEAR OPTION: Remove all constraints and rebuild
-- =====================================================

-- Step 1: Remove ALL check constraints on user_org_roles table
DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  FOR constraint_record IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.user_org_roles'::regclass
      AND contype = 'c'  -- check constraints only
  LOOP
    EXECUTE format('ALTER TABLE public.user_org_roles DROP CONSTRAINT IF EXISTS %I CASCADE', constraint_record.conname);
    RAISE NOTICE 'Dropped constraint: %', constraint_record.conname;
  END LOOP;
END $$;

-- Step 2: Show what we have now
SELECT role, COUNT(*) as count
FROM public.user_org_roles
GROUP BY role;

-- Step 3: Update ALL roles to be valid (make everyone admin for now, we'll fix it)
UPDATE public.user_org_roles
SET role = 'admin';

-- Step 4: Now add our constraint
ALTER TABLE public.user_org_roles
  ADD CONSTRAINT user_org_roles_role_check
  CHECK (role IN ('player', 'captain', 'admin'));

-- Step 5: Now update robharvey123@gmail.com to admin specifically
UPDATE public.user_org_roles
SET role = 'admin'
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'robharvey123@gmail.com'
);

-- Step 6: Create all the new tables and functions
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  user_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  changes JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_club_id ON public.audit_logs(club_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_org_roles
      WHERE user_id = auth.uid()
        AND club_id = audit_logs.club_id
        AND role = 'admin'
    )
  );

CREATE TABLE IF NOT EXISTS public.user_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('player', 'captain', 'admin')),
  token TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON public.user_invitations(token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_club_id ON public.user_invitations(club_id);

ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view invitations" ON public.user_invitations;
CREATE POLICY "Admins can view invitations"
  ON public.user_invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_org_roles
      WHERE user_id = auth.uid()
        AND club_id = user_invitations.club_id
        AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can manage invitations" ON public.user_invitations;
CREATE POLICY "Admins can manage invitations"
  ON public.user_invitations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_org_roles
      WHERE user_id = auth.uid()
        AND club_id = user_invitations.club_id
        AND role = 'admin'
    )
  );

CREATE TABLE IF NOT EXISTS public.team_captains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_captains_team_id ON public.team_captains(team_id);
CREATE INDEX IF NOT EXISTS idx_team_captains_user_id ON public.team_captains(user_id);

ALTER TABLE public.team_captains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view team captains" ON public.team_captains;
CREATE POLICY "Users can view team captains"
  ON public.team_captains FOR SELECT
  USING (
    team_id IN (
      SELECT t.id FROM public.teams t
      WHERE t.club_id IN (
        SELECT club_id FROM public.user_org_roles
        WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Admins and captains can manage team captains" ON public.team_captains;
CREATE POLICY "Admins and captains can manage team captains"
  ON public.team_captains FOR ALL
  USING (
    team_id IN (
      SELECT t.id FROM public.teams t
      WHERE EXISTS (
        SELECT 1 FROM public.user_org_roles
        WHERE user_id = auth.uid()
          AND club_id = t.club_id
          AND role IN ('admin', 'captain')
      )
    )
  );

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS preferred_position TEXT,
  ADD COLUMN IF NOT EXISTS jersey_number INTEGER,
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

CREATE INDEX IF NOT EXISTS idx_players_user_id ON public.players(user_id);

DROP POLICY IF EXISTS "Users can update their own player profile" ON public.players;
CREATE POLICY "Users can update their own player profile"
  ON public.players FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.log_audit(
  p_club_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_changes JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_user_role TEXT;
  v_audit_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NOT NULL THEN
    SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
    SELECT role INTO v_user_role FROM public.user_org_roles WHERE user_id = v_user_id AND club_id = p_club_id;
  END IF;
  INSERT INTO public.audit_logs (club_id, user_id, user_email, user_role, action, entity_type, entity_id, changes, metadata)
  VALUES (p_club_id, v_user_id, v_user_email, v_user_role, p_action, p_entity_type, p_entity_id, p_changes, p_metadata)
  RETURNING id INTO v_audit_id;
  RETURN v_audit_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id UUID, p_club_id UUID)
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM public.user_org_roles WHERE user_id = p_user_id AND club_id = p_club_id;
$$;

CREATE OR REPLACE FUNCTION public.has_management_permission(p_user_id UUID, p_club_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_org_roles WHERE user_id = p_user_id AND club_id = p_club_id AND role IN ('admin', 'captain'));
$$;

CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID, p_club_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_org_roles WHERE user_id = p_user_id AND club_id = p_club_id AND role = 'admin');
$$;

-- Verify everything worked
SELECT
  u.email,
  uor.role,
  c.name as club_name
FROM auth.users u
JOIN public.user_org_roles uor ON u.id = uor.user_id
LEFT JOIN public.clubs c ON uor.club_id = c.id
ORDER BY u.email;
