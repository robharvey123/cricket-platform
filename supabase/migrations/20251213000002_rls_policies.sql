-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_org_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE innings ENABLE ROW LEVEL SECURITY;
ALTER TABLE batting_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE bowling_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE fielding_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Check if user has access to a club
CREATE OR REPLACE FUNCTION has_club_access(p_club_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_org_roles
    WHERE user_id = auth.uid()
    AND club_id = p_club_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is org admin for a club
CREATE OR REPLACE FUNCTION is_org_admin(p_club_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_org_roles
    WHERE user_id = auth.uid()
    AND club_id = p_club_id
    AND role = 'org_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CLUBS POLICIES
-- ============================================================================

-- Users can view clubs they belong to
CREATE POLICY "Users can view their clubs"
  ON clubs FOR SELECT
  USING (has_club_access(id) OR public_leaderboard_enabled = true);

-- Only org_admin can update clubs
CREATE POLICY "Org admins can update their clubs"
  ON clubs FOR UPDATE
  USING (is_org_admin(id));

-- Only org_admin can insert clubs (for MVP, we'll seed manually)
CREATE POLICY "Org admins can insert clubs"
  ON clubs FOR INSERT
  WITH CHECK (true); -- In production, tighten this

-- ============================================================================
-- USER_ORG_ROLES POLICIES
-- ============================================================================

-- Users can view their own roles
CREATE POLICY "Users can view their own roles"
  ON user_org_roles FOR SELECT
  USING (user_id = auth.uid() OR is_org_admin(club_id));

-- Org admins can manage roles
CREATE POLICY "Org admins can manage roles"
  ON user_org_roles FOR ALL
  USING (is_org_admin(club_id));

-- ============================================================================
-- SEASONS POLICIES
-- ============================================================================

CREATE POLICY "Users can view seasons for their clubs"
  ON seasons FOR SELECT
  USING (has_club_access(club_id));

CREATE POLICY "Org admins can manage seasons"
  ON seasons FOR ALL
  USING (is_org_admin(club_id));

-- ============================================================================
-- TEAMS POLICIES
-- ============================================================================

CREATE POLICY "Users can view teams for their clubs"
  ON teams FOR SELECT
  USING (has_club_access(club_id));

CREATE POLICY "Org admins can manage teams"
  ON teams FOR ALL
  USING (is_org_admin(club_id));

-- ============================================================================
-- PLAYERS POLICIES
-- ============================================================================

CREATE POLICY "Users can view players for their clubs"
  ON players FOR SELECT
  USING (has_club_access(club_id));

CREATE POLICY "Org admins can manage players"
  ON players FOR ALL
  USING (is_org_admin(club_id));

-- ============================================================================
-- TEAM_PLAYERS POLICIES
-- ============================================================================

CREATE POLICY "Users can view team players"
  ON team_players FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_players.team_id
      AND has_club_access(teams.club_id)
    )
  );

CREATE POLICY "Org admins can manage team players"
  ON team_players FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_players.team_id
      AND is_org_admin(teams.club_id)
    )
  );

-- ============================================================================
-- MATCHES POLICIES
-- ============================================================================

-- Public can view published matches if public leaderboard enabled
CREATE POLICY "Public can view published matches for public clubs"
  ON matches FOR SELECT
  USING (
    published = true AND
    EXISTS (
      SELECT 1 FROM clubs
      WHERE clubs.id = matches.club_id
      AND clubs.public_leaderboard_enabled = true
    )
  );

CREATE POLICY "Users can view matches for their clubs"
  ON matches FOR SELECT
  USING (has_club_access(club_id));

CREATE POLICY "Org admins can manage matches"
  ON matches FOR ALL
  USING (is_org_admin(club_id));

-- ============================================================================
-- INNINGS POLICIES
-- ============================================================================

CREATE POLICY "Users can view innings"
  ON innings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = innings.match_id
      AND (has_club_access(matches.club_id) OR
           (matches.published = true AND
            EXISTS (SELECT 1 FROM clubs WHERE clubs.id = matches.club_id AND clubs.public_leaderboard_enabled = true)))
    )
  );

CREATE POLICY "Org admins can manage innings"
  ON innings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = innings.match_id
      AND is_org_admin(matches.club_id)
    )
  );

-- ============================================================================
-- BATTING_CARDS POLICIES
-- ============================================================================

CREATE POLICY "Users can view batting cards"
  ON batting_cards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = batting_cards.match_id
      AND (has_club_access(matches.club_id) OR
           (matches.published = true AND
            EXISTS (SELECT 1 FROM clubs WHERE clubs.id = matches.club_id AND clubs.public_leaderboard_enabled = true)))
    )
  );

CREATE POLICY "Org admins can manage batting cards"
  ON batting_cards FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = batting_cards.match_id
      AND is_org_admin(matches.club_id)
    )
  );

-- ============================================================================
-- BOWLING_CARDS POLICIES
-- ============================================================================

CREATE POLICY "Users can view bowling cards"
  ON bowling_cards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = bowling_cards.match_id
      AND (has_club_access(matches.club_id) OR
           (matches.published = true AND
            EXISTS (SELECT 1 FROM clubs WHERE clubs.id = matches.club_id AND clubs.public_leaderboard_enabled = true)))
    )
  );

CREATE POLICY "Org admins can manage bowling cards"
  ON bowling_cards FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = bowling_cards.match_id
      AND is_org_admin(matches.club_id)
    )
  );

-- ============================================================================
-- FIELDING_CARDS POLICIES
-- ============================================================================

CREATE POLICY "Users can view fielding cards"
  ON fielding_cards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = fielding_cards.match_id
      AND (has_club_access(matches.club_id) OR
           (matches.published = true AND
            EXISTS (SELECT 1 FROM clubs WHERE clubs.id = matches.club_id AND clubs.public_leaderboard_enabled = true)))
    )
  );

CREATE POLICY "Org admins can manage fielding cards"
  ON fielding_cards FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = fielding_cards.match_id
      AND is_org_admin(matches.club_id)
    )
  );

-- ============================================================================
-- SCORING_CONFIGS POLICIES
-- ============================================================================

CREATE POLICY "Users can view scoring configs"
  ON scoring_configs FOR SELECT
  USING (has_club_access(club_id));

CREATE POLICY "Org admins can manage scoring configs"
  ON scoring_configs FOR ALL
  USING (is_org_admin(club_id));

-- ============================================================================
-- POINTS_EVENTS POLICIES
-- ============================================================================

CREATE POLICY "Users can view points events"
  ON points_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = points_events.match_id
      AND (has_club_access(matches.club_id) OR
           (matches.published = true AND
            EXISTS (SELECT 1 FROM clubs WHERE clubs.id = matches.club_id AND clubs.public_leaderboard_enabled = true)))
    )
  );

CREATE POLICY "System can insert points events"
  ON points_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = points_events.match_id
      AND is_org_admin(matches.club_id)
    )
  );

-- ============================================================================
-- AUDIT_LOGS POLICIES
-- ============================================================================

CREATE POLICY "Org admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (is_org_admin(club_id));

CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true); -- Audit logs can be inserted by authenticated users
