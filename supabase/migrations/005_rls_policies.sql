-- ============================================
-- MIGRATION 005: Row Level Security
-- ============================================

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_season_stats ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ORGANIZATIONS
-- ============================================

-- Users can see their own organization
CREATE POLICY "Users can view own organization" ON organizations
  FOR SELECT USING (
    id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

-- Admins can update their organization
CREATE POLICY "Admins can update organization" ON organizations
  FOR UPDATE USING (
    id IN (SELECT org_id FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- PROFILES
-- ============================================

-- Users can view profiles in their organization
CREATE POLICY "Users can view org profiles" ON profiles
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Admins can update any profile in their org
CREATE POLICY "Admins can update org profiles" ON profiles
  FOR UPDATE USING (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- TEAMS
-- ============================================

-- Users can view teams in their organization
CREATE POLICY "Users can view org teams" ON teams
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

-- Admins can manage teams
CREATE POLICY "Admins can manage teams" ON teams
  FOR ALL USING (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- MATCHES
-- ============================================

-- Users can view matches in their organization
CREATE POLICY "Users can view org matches" ON matches
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

-- Admins and captains can manage matches
CREATE POLICY "Admins/captains can manage matches" ON matches
  FOR ALL USING (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'captain'))
  );

-- ============================================
-- INVITES
-- ============================================

-- Admins and captains can view invites
CREATE POLICY "Admins/captains can view invites" ON invites
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'captain'))
  );

-- Admins and captains can create invites
CREATE POLICY "Admins/captains can create invites" ON invites
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'captain'))
  );

-- ============================================
-- AVAILABILITY
-- ============================================

-- Users can view availability in their organization
CREATE POLICY "Users can view org availability" ON availability
  FOR SELECT USING (
    match_id IN (
      SELECT id FROM matches WHERE org_id IN (
        SELECT org_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Users can set their own availability
CREATE POLICY "Users can set own availability" ON availability
  FOR INSERT WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update own availability" ON availability
  FOR UPDATE USING (profile_id = auth.uid());

-- ============================================
-- SELECTIONS
-- ============================================

-- Users can view selections in their organization
CREATE POLICY "Users can view org selections" ON selections
  FOR SELECT USING (
    match_id IN (
      SELECT id FROM matches WHERE org_id IN (
        SELECT org_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Admins and captains can manage selections
CREATE POLICY "Admins/captains can manage selections" ON selections
  FOR ALL USING (
    match_id IN (
      SELECT id FROM matches WHERE org_id IN (
        SELECT org_id FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'captain')
      )
    )
  );

-- ============================================
-- PAYMENTS
-- ============================================

-- Users can view their own payment requests
CREATE POLICY "Users can view own payment requests" ON payment_requests
  FOR SELECT USING (profile_id = auth.uid());

-- Admins and treasurers can view all org payment requests
CREATE POLICY "Admins/treasurers can view org payment requests" ON payment_requests
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'treasurer'))
  );

-- Admins and treasurers can manage payment requests
CREATE POLICY "Admins/treasurers can manage payment requests" ON payment_requests
  FOR ALL USING (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'treasurer'))
  );

-- Similar for payments table
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Admins/treasurers can view org payments" ON payments
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'treasurer'))
  );

-- ============================================
-- PLAYER STATS
-- ============================================

-- Users can view stats in their organization
CREATE POLICY "Users can view org stats" ON player_stats
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

-- Admins, captains, scorers can manage stats
CREATE POLICY "Authorized users can manage stats" ON player_stats
  FOR ALL USING (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'captain', 'scorer'))
  );

CREATE POLICY "Users can view org season stats" ON player_season_stats
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  );
