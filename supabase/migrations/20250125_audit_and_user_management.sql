-- Audit Log and User Management Migration
-- Adds audit logging for all changes and user management features

-- ============================================================================
-- AUDIT LOG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  user_role TEXT,
  action TEXT NOT NULL, -- 'create', 'update', 'delete'
  entity_type TEXT NOT NULL, -- 'match', 'player', 'season', 'team', 'user_role', etc.
  entity_id UUID,
  changes JSONB, -- Before/after values for updates
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_club_id ON public.audit_logs(club_id);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Audit logs are readable by all club members
CREATE POLICY audit_logs_select ON public.audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_org_roles
      WHERE user_id = auth.uid() AND club_id = audit_logs.club_id
    )
  );

-- Audit logs are only insertable by the system (not through normal UI)
-- But we allow inserts for logging purposes
CREATE POLICY audit_logs_insert ON public.audit_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_org_roles
      WHERE user_id = auth.uid() AND club_id = audit_logs.club_id
    )
  );

-- ============================================================================
-- USER INVITATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('player', 'captain', 'admin')),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(club_id, email)
);

CREATE INDEX idx_user_invitations_token ON public.user_invitations(token);
CREATE INDEX idx_user_invitations_email ON public.user_invitations(email);

ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Only admins can see invitations
CREATE POLICY user_invitations_select ON public.user_invitations
  FOR SELECT
  USING (
    public.is_admin(auth.uid(), club_id)
  );

-- Only admins can create invitations
CREATE POLICY user_invitations_insert ON public.user_invitations
  FOR INSERT
  WITH CHECK (
    public.is_admin(auth.uid(), club_id)
  );

-- ============================================================================
-- TEAM CAPTAINS TABLE (Many-to-many: users can captain multiple teams)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.team_captains (
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (team_id, user_id)
);

ALTER TABLE public.team_captains ENABLE ROW LEVEL SECURITY;

-- All club members can see captains
CREATE POLICY team_captains_select ON public.team_captains
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      JOIN public.user_org_roles uor ON uor.club_id = t.club_id
      WHERE t.id = team_captains.team_id AND uor.user_id = auth.uid()
    )
  );

-- Only admins can assign captains
CREATE POLICY team_captains_insert ON public.team_captains
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_captains.team_id
        AND public.is_admin(auth.uid(), t.club_id)
    )
  );

CREATE POLICY team_captains_delete ON public.team_captains
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_captains.team_id
        AND public.is_admin(auth.uid(), t.club_id)
    )
  );

-- ============================================================================
-- PLAYER PROFILES (Extended info for self-service editing)
-- ============================================================================
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS preferred_position TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS jersey_number INTEGER;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS photo_url TEXT;

CREATE INDEX IF NOT EXISTS idx_players_user_id ON public.players(user_id);

-- Players can update their own profile
CREATE POLICY players_update_own ON public.players
  FOR UPDATE
  USING (
    user_id = auth.uid()
  );

-- ============================================================================
-- AUDIT LOG HELPER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.log_audit(
  p_club_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_changes JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
  v_user_role TEXT;
BEGIN
  -- Get user's role
  SELECT role INTO v_user_role
  FROM public.user_org_roles
  WHERE user_id = auth.uid() AND club_id = p_club_id
  LIMIT 1;

  -- Insert audit log
  INSERT INTO public.audit_logs (
    club_id,
    user_id,
    user_email,
    user_role,
    action,
    entity_type,
    entity_id,
    changes,
    metadata
  )
  VALUES (
    p_club_id,
    auth.uid(),
    auth.email(),
    v_user_role,
    p_action,
    p_entity_type,
    p_entity_id,
    p_changes,
    p_metadata
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

COMMENT ON FUNCTION public.log_audit IS 'Creates an audit log entry for tracking changes';
COMMENT ON TABLE public.audit_logs IS 'Audit trail of all changes made in the system';
COMMENT ON TABLE public.user_invitations IS 'Pending user invitations to join clubs';
COMMENT ON TABLE public.team_captains IS 'Links users to teams they captain';
