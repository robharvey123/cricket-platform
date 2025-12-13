-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Clubs (Organizations) - Multi-tenant root
CREATE TABLE clubs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  play_cricket_site_id TEXT,
  play_cricket_api_token TEXT,
  logo_url TEXT,
  public_leaderboard_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Organization Roles - Multi-tenant access control
CREATE TABLE user_org_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('org_admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, club_id)
);

-- Seasons
CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(club_id, name)
);

-- Teams
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  play_cricket_team_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(club_id, season_id, name)
);

-- Players
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  external_ids JSONB DEFAULT '{}', -- Store Play-Cricket IDs, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team Players (Squad membership)
CREATE TABLE team_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, player_id)
);

-- ============================================================================
-- MATCH & PERFORMANCE TABLES
-- ============================================================================

-- Matches
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  opponent_name TEXT NOT NULL,
  match_date DATE NOT NULL,
  venue TEXT,
  match_type TEXT CHECK (match_type IN ('league', 'cup', 'friendly')),
  result TEXT, -- 'won', 'lost', 'tied', 'draw', 'abandoned'
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'play-cricket', 'csv')),
  source_match_id TEXT, -- External match ID (e.g., Play-Cricket match ID)
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Innings
CREATE TABLE innings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  innings_number INTEGER NOT NULL CHECK (innings_number > 0),
  batting_team TEXT NOT NULL, -- 'home' or 'away'
  total_runs INTEGER,
  wickets INTEGER,
  overs NUMERIC(5,1),
  extras INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, innings_number)
);

-- Batting Cards
CREATE TABLE batting_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  innings_id UUID NOT NULL REFERENCES innings(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  position INTEGER,
  runs INTEGER DEFAULT 0,
  balls_faced INTEGER DEFAULT 0,
  fours INTEGER DEFAULT 0,
  sixes INTEGER DEFAULT 0,
  dismissal_type TEXT,
  dismissal_text TEXT,
  is_out BOOLEAN DEFAULT false,
  derived BOOLEAN DEFAULT false, -- True if zero-row auto-generated
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, innings_id, player_id)
);

-- Bowling Cards
CREATE TABLE bowling_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  innings_id UUID NOT NULL REFERENCES innings(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  overs NUMERIC(5,1) DEFAULT 0,
  maidens INTEGER DEFAULT 0,
  runs_conceded INTEGER DEFAULT 0,
  wickets INTEGER DEFAULT 0,
  wides INTEGER DEFAULT 0,
  no_balls INTEGER DEFAULT 0,
  derived BOOLEAN DEFAULT false, -- True if zero-row auto-generated
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, innings_id, player_id)
);

-- Fielding Cards
CREATE TABLE fielding_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  catches INTEGER DEFAULT 0,
  stumpings INTEGER DEFAULT 0,
  run_outs INTEGER DEFAULT 0,
  drops INTEGER DEFAULT 0,
  misfields INTEGER DEFAULT 0,
  derived BOOLEAN DEFAULT false, -- True if zero-row auto-generated
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, player_id)
);

-- ============================================================================
-- SCORING SYSTEM
-- ============================================================================

-- Scoring Configurations (Admin configurable)
CREATE TABLE scoring_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  formula_json JSONB NOT NULL, -- Stores the full scoring rules
  is_active BOOLEAN DEFAULT false,
  effective_from TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(club_id, season_id, version)
);

-- Points Events (Atomic points per player per match)
CREATE TABLE points_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  scoring_config_id UUID NOT NULL REFERENCES scoring_configs(id),
  category TEXT NOT NULL, -- 'batting', 'bowling', 'fielding'
  event_type TEXT NOT NULL, -- 'run', '4', '6', '50', 'duck', 'wicket', 'maiden', 'catch', etc.
  points INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}', -- Additional context (e.g., runs scored, wickets taken)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- AUDIT LOGS
-- ============================================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'match_published', 'match_republished', 'scoring_config_changed', etc.
  resource_type TEXT NOT NULL, -- 'match', 'scoring_config', 'player', etc.
  resource_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_user_org_roles_user_id ON user_org_roles(user_id);
CREATE INDEX idx_user_org_roles_club_id ON user_org_roles(club_id);
CREATE INDEX idx_seasons_club_id ON seasons(club_id);
CREATE INDEX idx_teams_club_id ON teams(club_id);
CREATE INDEX idx_teams_season_id ON teams(season_id);
CREATE INDEX idx_players_club_id ON players(club_id);
CREATE INDEX idx_team_players_team_id ON team_players(team_id);
CREATE INDEX idx_team_players_player_id ON team_players(player_id);
CREATE INDEX idx_matches_club_id ON matches(club_id);
CREATE INDEX idx_matches_season_id ON matches(season_id);
CREATE INDEX idx_matches_team_id ON matches(team_id);
CREATE INDEX idx_matches_published ON matches(published);
CREATE INDEX idx_innings_match_id ON innings(match_id);
CREATE INDEX idx_batting_cards_match_id ON batting_cards(match_id);
CREATE INDEX idx_batting_cards_player_id ON batting_cards(player_id);
CREATE INDEX idx_bowling_cards_match_id ON bowling_cards(match_id);
CREATE INDEX idx_bowling_cards_player_id ON bowling_cards(player_id);
CREATE INDEX idx_fielding_cards_match_id ON fielding_cards(match_id);
CREATE INDEX idx_fielding_cards_player_id ON fielding_cards(player_id);
CREATE INDEX idx_scoring_configs_club_id ON scoring_configs(club_id);
CREATE INDEX idx_scoring_configs_season_id ON scoring_configs(season_id);
CREATE INDEX idx_points_events_match_id ON points_events(match_id);
CREATE INDEX idx_points_events_player_id ON points_events(player_id);
CREATE INDEX idx_audit_logs_club_id ON audit_logs(club_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clubs_updated_at BEFORE UPDATE ON clubs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seasons_updated_at BEFORE UPDATE ON seasons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_innings_updated_at BEFORE UPDATE ON innings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_batting_cards_updated_at BEFORE UPDATE ON batting_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bowling_cards_updated_at BEFORE UPDATE ON bowling_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fielding_cards_updated_at BEFORE UPDATE ON fielding_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
