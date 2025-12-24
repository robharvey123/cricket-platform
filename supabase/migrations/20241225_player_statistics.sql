-- Player Statistics & Leaderboards Migration
-- Phase 4: Aggregated stats and leaderboard views

-- ============================================================================
-- PLAYER SEASON STATS (Aggregated statistics per player per season)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.player_season_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,

  -- Batting Stats
  matches_batted INT DEFAULT 0,
  innings_batted INT DEFAULT 0,
  not_outs INT DEFAULT 0,
  runs_scored INT DEFAULT 0,
  balls_faced INT DEFAULT 0,
  fours INT DEFAULT 0,
  sixes INT DEFAULT 0,
  highest_score INT DEFAULT 0,
  fifties INT DEFAULT 0,
  hundreds INT DEFAULT 0,
  ducks INT DEFAULT 0,
  batting_average NUMERIC(6,2),
  batting_strike_rate NUMERIC(6,2),

  -- Bowling Stats
  matches_bowled INT DEFAULT 0,
  innings_bowled INT DEFAULT 0,
  overs_bowled NUMERIC(6,1) DEFAULT 0,
  maidens INT DEFAULT 0,
  runs_conceded INT DEFAULT 0,
  wickets INT DEFAULT 0,
  best_bowling_wickets INT DEFAULT 0,
  best_bowling_runs INT DEFAULT 0,
  three_fors INT DEFAULT 0,
  five_fors INT DEFAULT 0,
  bowling_average NUMERIC(6,2),
  bowling_economy NUMERIC(5,2),
  bowling_strike_rate NUMERIC(6,2),

  -- Fielding Stats
  catches INT DEFAULT 0,
  stumpings INT DEFAULT 0,
  run_outs INT DEFAULT 0,
  drops INT DEFAULT 0,

  -- Points
  total_points NUMERIC(10,2) DEFAULT 0,
  batting_points NUMERIC(10,2) DEFAULT 0,
  bowling_points NUMERIC(10,2) DEFAULT 0,
  fielding_points NUMERIC(10,2) DEFAULT 0,

  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(player_id, season_id)
);

ALTER TABLE public.player_season_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policy for player_season_stats
CREATE POLICY player_season_stats_select ON public.player_season_stats
  FOR SELECT USING (
    club_id IN (
      SELECT club_id FROM public.user_org_roles
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- PLAYER MATCH PERFORMANCE (Per-match points breakdown)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.player_match_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,

  -- Performance stats for this match
  runs INT DEFAULT 0,
  balls_faced INT DEFAULT 0,
  fours INT DEFAULT 0,
  sixes INT DEFAULT 0,
  wickets INT DEFAULT 0,
  overs_bowled NUMERIC(4,1) DEFAULT 0,
  runs_conceded INT DEFAULT 0,
  maidens INT DEFAULT 0,
  catches INT DEFAULT 0,
  stumpings INT DEFAULT 0,
  run_outs INT DEFAULT 0,

  -- Points breakdown
  batting_points NUMERIC(8,2) DEFAULT 0,
  bowling_points NUMERIC(8,2) DEFAULT 0,
  fielding_points NUMERIC(8,2) DEFAULT 0,
  total_points NUMERIC(8,2) DEFAULT 0,
  points_breakdown JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(player_id, match_id)
);

ALTER TABLE public.player_match_performance ENABLE ROW LEVEL SECURITY;

-- RLS Policy for player_match_performance
CREATE POLICY player_match_performance_select ON public.player_match_performance
  FOR SELECT USING (
    club_id IN (
      SELECT club_id FROM public.user_org_roles
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- FUNCTION: Calculate batting average
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_batting_average(
  total_runs INT,
  not_outs INT,
  innings INT
)
RETURNS NUMERIC AS $$
BEGIN
  IF innings = 0 OR (innings - not_outs) = 0 THEN
    RETURN NULL;
  END IF;
  RETURN ROUND(total_runs::NUMERIC / (innings - not_outs)::NUMERIC, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- FUNCTION: Calculate strike rate (batting)
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_strike_rate(
  runs INT,
  balls INT
)
RETURNS NUMERIC AS $$
BEGIN
  IF balls = 0 THEN
    RETURN NULL;
  END IF;
  RETURN ROUND((runs::NUMERIC / balls::NUMERIC) * 100, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- FUNCTION: Calculate bowling average
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_bowling_average(
  runs INT,
  wickets INT
)
RETURNS NUMERIC AS $$
BEGIN
  IF wickets = 0 THEN
    RETURN NULL;
  END IF;
  RETURN ROUND(runs::NUMERIC / wickets::NUMERIC, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- FUNCTION: Calculate economy rate
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_economy(
  runs INT,
  overs NUMERIC
)
RETURNS NUMERIC AS $$
BEGIN
  IF overs = 0 THEN
    RETURN NULL;
  END IF;
  RETURN ROUND(runs::NUMERIC / overs::NUMERIC, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- FUNCTION: Calculate bowling strike rate
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_bowling_strike_rate(
  balls NUMERIC,
  wickets INT
)
RETURNS NUMERIC AS $$
BEGIN
  IF wickets = 0 THEN
    RETURN NULL;
  END IF;
  RETURN ROUND(balls::NUMERIC / wickets::NUMERIC, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- VIEW: Season Leaderboards (Batting)
-- ============================================================================
CREATE OR REPLACE VIEW public.v_batting_leaderboard AS
SELECT
  pss.*,
  p.first_name,
  p.last_name,
  (p.first_name || ' ' || p.last_name) as full_name,
  s.name as season_name,
  ROW_NUMBER() OVER (PARTITION BY pss.season_id ORDER BY pss.runs_scored DESC) as runs_rank,
  ROW_NUMBER() OVER (PARTITION BY pss.season_id ORDER BY pss.batting_average DESC NULLS LAST) as average_rank,
  ROW_NUMBER() OVER (PARTITION BY pss.season_id ORDER BY pss.batting_strike_rate DESC NULLS LAST) as sr_rank
FROM public.player_season_stats pss
JOIN public.players p ON pss.player_id = p.id
JOIN public.seasons s ON pss.season_id = s.id
WHERE pss.innings_batted > 0;

-- ============================================================================
-- VIEW: Season Leaderboards (Bowling)
-- ============================================================================
CREATE OR REPLACE VIEW public.v_bowling_leaderboard AS
SELECT
  pss.*,
  p.first_name,
  p.last_name,
  (p.first_name || ' ' || p.last_name) as full_name,
  s.name as season_name,
  ROW_NUMBER() OVER (PARTITION BY pss.season_id ORDER BY pss.wickets DESC) as wickets_rank,
  ROW_NUMBER() OVER (PARTITION BY pss.season_id ORDER BY pss.bowling_average ASC NULLS LAST) as average_rank,
  ROW_NUMBER() OVER (PARTITION BY pss.season_id ORDER BY pss.bowling_economy ASC NULLS LAST) as economy_rank
FROM public.player_season_stats pss
JOIN public.players p ON pss.player_id = p.id
JOIN public.seasons s ON pss.season_id = s.id
WHERE pss.innings_bowled > 0;

-- ============================================================================
-- VIEW: Points Leaderboard
-- ============================================================================
CREATE OR REPLACE VIEW public.v_points_leaderboard AS
SELECT
  pss.*,
  p.first_name,
  p.last_name,
  (p.first_name || ' ' || p.last_name) as full_name,
  s.name as season_name,
  ROW_NUMBER() OVER (PARTITION BY pss.season_id ORDER BY pss.total_points DESC) as points_rank
FROM public.player_season_stats pss
JOIN public.players p ON pss.player_id = p.id
JOIN public.seasons s ON pss.season_id = s.id
WHERE pss.total_points > 0;

-- ============================================================================
-- Create indexes for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_player_season_stats_player ON public.player_season_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_player_season_stats_season ON public.player_season_stats(season_id);
CREATE INDEX IF NOT EXISTS idx_player_season_stats_club ON public.player_season_stats(club_id);
CREATE INDEX IF NOT EXISTS idx_player_season_stats_runs ON public.player_season_stats(runs_scored DESC);
CREATE INDEX IF NOT EXISTS idx_player_season_stats_wickets ON public.player_season_stats(wickets DESC);
CREATE INDEX IF NOT EXISTS idx_player_season_stats_points ON public.player_season_stats(total_points DESC);

CREATE INDEX IF NOT EXISTS idx_player_match_performance_player ON public.player_match_performance(player_id);
CREATE INDEX IF NOT EXISTS idx_player_match_performance_match ON public.player_match_performance(match_id);
CREATE INDEX IF NOT EXISTS idx_player_match_performance_season ON public.player_match_performance(season_id);
