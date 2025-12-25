-- Role-Based Permissions Migration
-- Adds role types and permission system for admin, captain, and player roles

-- ============================================================================
-- ROLE TYPES
-- ============================================================================
-- Define allowed roles (enforced at application level and via check constraint)
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('player', 'captain', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Update user_org_roles table to use the enum and add role constraints
ALTER TABLE public.user_org_roles
  ALTER COLUMN role TYPE TEXT;

-- Add check constraint for valid roles
ALTER TABLE public.user_org_roles
  DROP CONSTRAINT IF EXISTS user_org_roles_role_check;

ALTER TABLE public.user_org_roles
  ADD CONSTRAINT user_org_roles_role_check
  CHECK (role IN ('player', 'captain', 'admin'));

-- ============================================================================
-- HELPER FUNCTIONS FOR ROLE CHECKS
-- ============================================================================

-- Function to get user's role for a club
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id UUID, p_club_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role
  FROM public.user_org_roles
  WHERE user_id = p_user_id AND club_id = p_club_id
  LIMIT 1;
$$;

-- Function to check if user has permission (admin or captain)
CREATE OR REPLACE FUNCTION public.has_management_permission(p_user_id UUID, p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_org_roles
    WHERE user_id = p_user_id
      AND club_id = p_club_id
      AND role IN ('admin', 'captain')
  );
$$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID, p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_org_roles
    WHERE user_id = p_user_id
      AND club_id = p_club_id
      AND role = 'admin'
  );
$$;

-- ============================================================================
-- UPDATE RLS POLICIES FOR ROLE-BASED ACCESS
-- ============================================================================

-- Seasons: Only admin and captain can modify
DROP POLICY IF EXISTS seasons_insert ON public.seasons;
DROP POLICY IF EXISTS seasons_update ON public.seasons;
DROP POLICY IF EXISTS seasons_delete ON public.seasons;

CREATE POLICY seasons_insert ON public.seasons
  FOR INSERT
  WITH CHECK (
    public.has_management_permission(auth.uid(), club_id)
  );

CREATE POLICY seasons_update ON public.seasons
  FOR UPDATE
  USING (
    public.has_management_permission(auth.uid(), club_id)
  );

CREATE POLICY seasons_delete ON public.seasons
  FOR DELETE
  USING (
    public.is_admin(auth.uid(), club_id)
  );

-- Teams: Only admin and captain can modify
DROP POLICY IF EXISTS teams_insert ON public.teams;
DROP POLICY IF EXISTS teams_update ON public.teams;
DROP POLICY IF EXISTS teams_delete ON public.teams;

CREATE POLICY teams_insert ON public.teams
  FOR INSERT
  WITH CHECK (
    public.has_management_permission(auth.uid(), club_id)
  );

CREATE POLICY teams_update ON public.teams
  FOR UPDATE
  USING (
    public.has_management_permission(auth.uid(), club_id)
  );

CREATE POLICY teams_delete ON public.teams
  FOR DELETE
  USING (
    public.is_admin(auth.uid(), club_id)
  );

-- Matches: Captain and admin can create/edit, only admin can delete
DROP POLICY IF EXISTS matches_update ON public.matches;
DROP POLICY IF EXISTS matches_delete ON public.matches;

CREATE POLICY matches_update ON public.matches
  FOR UPDATE
  USING (
    public.has_management_permission(auth.uid(), club_id)
  );

CREATE POLICY matches_delete ON public.matches
  FOR DELETE
  USING (
    public.is_admin(auth.uid(), club_id)
  );

-- Scoring Config: Only admin can modify
DROP POLICY IF EXISTS scoring_configs_insert ON public.scoring_configs;
DROP POLICY IF EXISTS scoring_configs_update ON public.scoring_configs;

CREATE POLICY scoring_configs_insert ON public.scoring_configs
  FOR INSERT
  WITH CHECK (
    public.is_admin(auth.uid(), club_id)
  );

CREATE POLICY scoring_configs_update ON public.scoring_configs
  FOR UPDATE
  USING (
    public.is_admin(auth.uid(), club_id)
  );

-- Comment for documentation
COMMENT ON FUNCTION public.get_user_role IS 'Returns the role of a user for a specific club';
COMMENT ON FUNCTION public.has_management_permission IS 'Returns true if user is admin or captain for the club';
COMMENT ON FUNCTION public.is_admin IS 'Returns true if user is admin for the club';
