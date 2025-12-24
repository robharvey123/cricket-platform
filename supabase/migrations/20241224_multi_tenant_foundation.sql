-- Multi-Tenant Foundation Migration
-- Phase 0: Core tables with RLS for cricket club platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CLUBS (Organizations/Tenants)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.clubs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  brand JSONB DEFAULT '{}'::jsonb,
  tier TEXT DEFAULT 'club',
  billing_status TEXT DEFAULT 'inactive',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USER ORG ROLES (Multi-tenant user membership)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_org_roles (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'player',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, club_id)
);

ALTER TABLE public.user_org_roles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SEASONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.seasons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TEAMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  competition TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PLAYERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  dob DATE,
  handedness TEXT,
  bowling_style TEXT,
  role TEXT,
  external_ids JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SQUADS (Team membership per season)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.squads (
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE,
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (team_id, season_id, player_id)
);

ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TEAM PLAYERS (Simple team membership, no season constraint)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.team_players (
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (team_id, player_id)
);

ALTER TABLE public.team_players ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- MATCHES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL,
  opponent_name TEXT NOT NULL,
  venue TEXT,
  match_date DATE NOT NULL,
  match_type TEXT,
  result TEXT,
  source TEXT DEFAULT 'manual',
  parse_status TEXT DEFAULT 'pending',
  published BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- INNINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.innings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  innings_number INT NOT NULL,
  batting_team TEXT NOT NULL, -- 'home' or 'away'
  total_runs INT,
  wickets INT,
  overs NUMERIC(5,1),
  extras INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.innings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- BATTING CARDS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.batting_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  innings_id UUID REFERENCES public.innings(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  position INT,
  runs INT DEFAULT 0,
  balls_faced INT DEFAULT 0,
  fours INT DEFAULT 0,
  sixes INT DEFAULT 0,
  dismissal_type TEXT,
  dismissal_text TEXT,
  is_out BOOLEAN DEFAULT FALSE,
  strike_rate NUMERIC(6,2),
  derived BOOLEAN DEFAULT FALSE, -- TRUE if auto-generated zero row
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.batting_cards ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- BOWLING CARDS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.bowling_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  innings_id UUID REFERENCES public.innings(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  overs NUMERIC(5,1) DEFAULT 0,
  maidens INT DEFAULT 0,
  runs_conceded INT DEFAULT 0,
  wickets INT DEFAULT 0,
  wides INT DEFAULT 0,
  no_balls INT DEFAULT 0,
  economy NUMERIC(5,2),
  derived BOOLEAN DEFAULT FALSE, -- TRUE if auto-generated zero row
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.bowling_cards ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- FIELDING CARDS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.fielding_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  catches INT DEFAULT 0,
  stumpings INT DEFAULT 0,
  runouts INT DEFAULT 0,
  drops INT DEFAULT 0,
  misfields INT DEFAULT 0,
  derived BOOLEAN DEFAULT FALSE, -- TRUE if auto-generated zero row
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.fielding_cards ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SCORING CONFIGS (Versioned points formulas)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.scoring_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  version INT NOT NULL,
  effective_from TIMESTAMPTZ DEFAULT NOW(),
  formula_json JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.scoring_configs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POINTS EVENTS (Atomic points tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.points_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  config_id UUID NOT NULL REFERENCES public.scoring_configs(id),
  metric TEXT NOT NULL,
  value NUMERIC NOT NULL,
  points NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.points_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- AUDIT LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  club_id UUID NOT NULL,
  actor UUID,
  action TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Clubs: Users can only see clubs they're members of
CREATE POLICY clubs_select ON public.clubs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_org_roles u
      WHERE u.user_id = auth.uid() AND u.club_id = id
    )
  );

-- User Org Roles: Users can see their own memberships
CREATE POLICY user_org_roles_select ON public.user_org_roles
  FOR SELECT USING (user_id = auth.uid());

-- Helper function to get user's club_id
CREATE OR REPLACE FUNCTION auth.user_club_id()
RETURNS UUID AS $$
  SELECT club_id FROM public.user_org_roles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- Seasons: Scoped to user's club
CREATE POLICY seasons_select ON public.seasons
  FOR SELECT USING (club_id = auth.user_club_id());

-- Teams: Scoped to user's club
CREATE POLICY teams_select ON public.teams
  FOR SELECT USING (club_id = auth.user_club_id());

-- Players: Scoped to user's club
CREATE POLICY players_select ON public.players
  FOR SELECT USING (club_id = auth.user_club_id());

CREATE POLICY players_insert ON public.players
  FOR INSERT WITH CHECK (club_id = auth.user_club_id());

CREATE POLICY players_update ON public.players
  FOR UPDATE USING (club_id = auth.user_club_id());

-- Squads: Scoped via team
CREATE POLICY squads_select ON public.squads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_id AND t.club_id = auth.user_club_id()
    )
  );

-- Team Players: Scoped via team
CREATE POLICY team_players_select ON public.team_players
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_id AND t.club_id = auth.user_club_id()
    )
  );

CREATE POLICY team_players_insert ON public.team_players
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_id AND t.club_id = auth.user_club_id()
    )
  );

-- Matches: Scoped to user's club
CREATE POLICY matches_select ON public.matches
  FOR SELECT USING (club_id = auth.user_club_id());

CREATE POLICY matches_insert ON public.matches
  FOR INSERT WITH CHECK (club_id = auth.user_club_id());

CREATE POLICY matches_update ON public.matches
  FOR UPDATE USING (club_id = auth.user_club_id());

-- Innings: Scoped via match
CREATE POLICY innings_select ON public.innings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND m.club_id = auth.user_club_id()
    )
  );

CREATE POLICY innings_insert ON public.innings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND m.club_id = auth.user_club_id()
    )
  );

-- Batting Cards: Scoped via match
CREATE POLICY batting_cards_select ON public.batting_cards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND m.club_id = auth.user_club_id()
    )
  );

CREATE POLICY batting_cards_insert ON public.batting_cards
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND m.club_id = auth.user_club_id()
    )
  );

-- Bowling Cards: Scoped via match
CREATE POLICY bowling_cards_select ON public.bowling_cards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND m.club_id = auth.user_club_id()
    )
  );

CREATE POLICY bowling_cards_insert ON public.bowling_cards
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND m.club_id = auth.user_club_id()
    )
  );

-- Fielding Cards: Scoped via match
CREATE POLICY fielding_cards_select ON public.fielding_cards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND m.club_id = auth.user_club_id()
    )
  );

CREATE POLICY fielding_cards_insert ON public.fielding_cards
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND m.club_id = auth.user_club_id()
    )
  );

-- Scoring Configs: Scoped to user's club
CREATE POLICY scoring_configs_select ON public.scoring_configs
  FOR SELECT USING (club_id = auth.user_club_id());

-- Points Events: Scoped via match
CREATE POLICY points_events_select ON public.points_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND m.club_id = auth.user_club_id()
    )
  );

-- Audit Logs: Scoped to user's club
CREATE POLICY audit_logs_select ON public.audit_logs
  FOR SELECT USING (club_id = auth.user_club_id());

-- ============================================================================
-- INDEXES for Performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_user_org_roles_user_id ON public.user_org_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_org_roles_club_id ON public.user_org_roles(club_id);
CREATE INDEX IF NOT EXISTS idx_teams_club_id ON public.teams(club_id);
CREATE INDEX IF NOT EXISTS idx_seasons_club_id ON public.seasons(club_id);
CREATE INDEX IF NOT EXISTS idx_players_club_id ON public.players(club_id);
CREATE INDEX IF NOT EXISTS idx_matches_club_id ON public.matches(club_id);
CREATE INDEX IF NOT EXISTS idx_matches_team_id ON public.matches(team_id);
CREATE INDEX IF NOT EXISTS idx_matches_season_id ON public.matches(season_id);
CREATE INDEX IF NOT EXISTS idx_innings_match_id ON public.innings(match_id);
CREATE INDEX IF NOT EXISTS idx_batting_cards_match_id ON public.batting_cards(match_id);
CREATE INDEX IF NOT EXISTS idx_batting_cards_player_id ON public.batting_cards(player_id);
CREATE INDEX IF NOT EXISTS idx_bowling_cards_match_id ON public.bowling_cards(match_id);
CREATE INDEX IF NOT EXISTS idx_bowling_cards_player_id ON public.bowling_cards(player_id);
CREATE INDEX IF NOT EXISTS idx_fielding_cards_match_id ON public.fielding_cards(match_id);
CREATE INDEX IF NOT EXISTS idx_fielding_cards_player_id ON public.fielding_cards(player_id);
