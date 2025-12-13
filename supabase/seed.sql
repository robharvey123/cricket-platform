-- ============================================================================
-- SEED DATA FOR BROOKWEALD CC (MVP)
-- ============================================================================

-- Insert Brookweald CC
INSERT INTO clubs (id, name, slug, public_leaderboard_enabled)
VALUES (
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'Brookweald Cricket Club',
  'brookweald-cc',
  true
) ON CONFLICT (slug) DO NOTHING;

-- Insert 2025 Season
INSERT INTO seasons (id, club_id, name, start_date, end_date, is_active)
VALUES (
  'b0000000-0000-0000-0000-000000000001'::uuid,
  'a0000000-0000-0000-0000-000000000001'::uuid,
  '2025 Season',
  '2025-04-01',
  '2025-09-30',
  true
) ON CONFLICT (club_id, name) DO NOTHING;

-- Insert 1st XI Team
INSERT INTO teams (id, club_id, season_id, name)
VALUES (
  'c0000000-0000-0000-0000-000000000001'::uuid,
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'b0000000-0000-0000-0000-000000000001'::uuid,
  '1st XI'
) ON CONFLICT (club_id, season_id, name) DO NOTHING;

-- Insert Default Scoring Configuration (Brookweald 2025 Rules)
INSERT INTO scoring_configs (
  id,
  club_id,
  season_id,
  version,
  name,
  is_active,
  formula_json
)
VALUES (
  'd0000000-0000-0000-0000-000000000001'::uuid,
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'b0000000-0000-0000-0000-000000000001'::uuid,
  1,
  'Brookweald 2025 Standard Scoring',
  true,
  '{
    "batting": {
      "run": 1,
      "four": 1,
      "six": 2,
      "milestone_50": 10,
      "milestone_100": 25,
      "duck": -10
    },
    "bowling": {
      "wicket": 15,
      "maiden": 5,
      "milestone_3_wickets": 10,
      "milestone_5_wickets": 25,
      "economy_bonus_threshold": 3.0,
      "economy_bonus_points": 10,
      "economy_penalty_threshold": 8.0,
      "economy_penalty_points": -10
    },
    "fielding": {
      "catch": 5,
      "stumping": 8,
      "run_out": 6,
      "drop": -5,
      "misfield": -2
    }
  }'::jsonb
) ON CONFLICT (club_id, season_id, version) DO NOTHING;

-- Insert Sample Players
INSERT INTO players (id, club_id, first_name, last_name) VALUES
  ('e0000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'John', 'Smith'),
  ('e0000000-0000-0000-0000-000000000002'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'James', 'Anderson'),
  ('e0000000-0000-0000-0000-000000000003'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'Ben', 'Stokes'),
  ('e0000000-0000-0000-0000-000000000004'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'Joe', 'Root'),
  ('e0000000-0000-0000-0000-000000000005'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'Stuart', 'Broad'),
  ('e0000000-0000-0000-0000-000000000006'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'Jos', 'Buttler'),
  ('e0000000-0000-0000-0000-000000000007'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'Jonny', 'Bairstow'),
  ('e0000000-0000-0000-0000-000000000008'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'Chris', 'Woakes'),
  ('e0000000-0000-0000-0000-000000000009'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'Mark', 'Wood'),
  ('e0000000-0000-0000-0000-00000000000a'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'Moeen', 'Ali'),
  ('e0000000-0000-0000-0000-00000000000b'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'Sam', 'Curran')
ON CONFLICT DO NOTHING;

-- Add players to 1st XI squad
INSERT INTO team_players (team_id, player_id)
SELECT
  'c0000000-0000-0000-0000-000000000001'::uuid,
  id
FROM players
WHERE club_id = 'a0000000-0000-0000-0000-000000000001'::uuid
ON CONFLICT DO NOTHING;

-- Note: Users and user_org_roles will be created through the application after auth signup
