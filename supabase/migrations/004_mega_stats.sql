-- ============================================
-- MIGRATION 004: Mega Stats
-- ============================================

-- Player performance per match
CREATE TABLE IF NOT EXISTS player_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,

  -- Batting
  runs_scored INT DEFAULT 0,
  balls_faced INT DEFAULT 0,
  fours INT DEFAULT 0,
  sixes INT DEFAULT 0,
  batting_position INT,
  how_out TEXT,

  -- Bowling
  overs_bowled DECIMAL(4,1) DEFAULT 0,
  runs_conceded INT DEFAULT 0,
  wickets_taken INT DEFAULT 0,
  maidens INT DEFAULT 0,
  wides INT DEFAULT 0,
  no_balls INT DEFAULT 0,

  -- Fielding
  catches INT DEFAULT 0,
  run_outs INT DEFAULT 0,
  stumpings INT DEFAULT 0,

  -- MVP
  mvp_points INT DEFAULT 0,

  -- Source
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'play_cricket', 'ai_parsed', 'csv')),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(profile_id, match_id)
);

-- Aggregated season stats (computed)
CREATE TABLE IF NOT EXISTS player_season_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  season TEXT NOT NULL,

  -- Batting
  matches_batted INT DEFAULT 0,
  innings INT DEFAULT 0,
  not_outs INT DEFAULT 0,
  runs_total INT DEFAULT 0,
  highest_score INT DEFAULT 0,
  batting_average DECIMAL(6,2),
  strike_rate DECIMAL(6,2),
  fifties INT DEFAULT 0,
  hundreds INT DEFAULT 0,

  -- Bowling
  overs_total DECIMAL(6,1) DEFAULT 0,
  wickets_total INT DEFAULT 0,
  runs_conceded_total INT DEFAULT 0,
  bowling_average DECIMAL(6,2),
  economy_rate DECIMAL(5,2),
  best_bowling TEXT,
  five_wicket_hauls INT DEFAULT 0,

  -- Fielding
  catches_total INT DEFAULT 0,
  run_outs_total INT DEFAULT 0,
  stumpings_total INT DEFAULT 0,

  -- MVP
  mvp_points_total INT DEFAULT 0,

  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(profile_id, season)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_player_stats_profile ON player_stats(profile_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_match ON player_stats(match_id);
CREATE INDEX IF NOT EXISTS idx_player_season_stats_profile ON player_season_stats(profile_id, season);
