-- Complete Seed Data for Brookweald Cricket Club
-- Run this in Supabase SQL Editor to set up everything

-- STEP 1: Create Brookweald CC (if not exists)
INSERT INTO public.clubs (name, slug, brand, tier, billing_status)
VALUES (
  'Brookweald Cricket Club',
  'brookweald',
  '{"primary_color": "#0ea5e9", "secondary_color": "#1e293b", "logo_url": null}'::jsonb,
  'club',
  'active'
)
ON CONFLICT (slug) DO NOTHING;

-- Get the club ID for subsequent inserts
DO $$
DECLARE
  v_club_id UUID;
  v_season_id UUID;
  v_team_1st_id UUID;
  v_team_2nd_id UUID;
BEGIN
  -- Get club ID
  SELECT id INTO v_club_id FROM public.clubs WHERE slug = 'brookweald';

  -- STEP 2: Create teams
  INSERT INTO public.teams (club_id, name, competition)
  VALUES
    (v_club_id, '1st XI', 'Saturday League'),
    (v_club_id, '2nd XI', 'Sunday League')
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_team_1st_id FROM public.teams WHERE club_id = v_club_id AND name = '1st XI';
  SELECT id INTO v_team_2nd_id FROM public.teams WHERE club_id = v_club_id AND name = '2nd XI';

  -- STEP 3: Create 2025 season
  INSERT INTO public.seasons (club_id, name, start_date, end_date, is_active)
  VALUES
    (v_club_id, '2025 Season', '2025-04-01', '2025-09-30', TRUE)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_season_id FROM public.seasons WHERE club_id = v_club_id AND name = '2025 Season';

  -- STEP 4: Create default scoring config
  INSERT INTO public.scoring_configs (club_id, season_id, name, version, formula_json, is_active)
  VALUES
    (v_club_id, v_season_id, 'Default Scoring', 1, '{
      "batting": {
        "per_run": 1,
        "boundary_4": 1,
        "boundary_6": 2,
        "milestones": [
          {"at": 50, "bonus": 10},
          {"at": 100, "bonus": 25}
        ],
        "duck_penalty": -10
      },
      "bowling": {
        "per_wicket": 15,
        "maiden_over": 5,
        "three_for_bonus": 10,
        "five_for_bonus": 25,
        "economy_bands": [
          {"max": 3.0, "bonus": 10},
          {"min": 8.0, "penalty": -10}
        ]
      },
      "fielding": {
        "catch": 5,
        "stumping": 8,
        "runout": 6,
        "drop_penalty": -5,
        "misfield_penalty": -2
      }
    }'::jsonb, TRUE)
  ON CONFLICT DO NOTHING;

  -- STEP 5: Create sample players for 1st XI
  INSERT INTO public.players (club_id, first_name, last_name, role, status)
  VALUES
    (v_club_id, 'James', 'Anderson', 'Bowler', 'active'),
    (v_club_id, 'Joe', 'Root', 'Batter', 'active'),
    (v_club_id, 'Ben', 'Stokes', 'All-rounder', 'active'),
    (v_club_id, 'Jonny', 'Bairstow', 'Wicket-keeper', 'active'),
    (v_club_id, 'Mark', 'Wood', 'Bowler', 'active'),
    (v_club_id, 'Chris', 'Woakes', 'All-rounder', 'active'),
    (v_club_id, 'Jos', 'Buttler', 'Wicket-keeper', 'active'),
    (v_club_id, 'Stuart', 'Broad', 'Bowler', 'active'),
    (v_club_id, 'Ollie', 'Pope', 'Batter', 'active'),
    (v_club_id, 'Harry', 'Brook', 'Batter', 'active'),
    (v_club_id, 'Zak', 'Crawley', 'Batter', 'active')
  ON CONFLICT DO NOTHING;

  -- STEP 6: Link players to 1st XI team
  INSERT INTO public.team_players (team_id, player_id)
  SELECT v_team_1st_id, p.id
  FROM public.players p
  WHERE p.club_id = v_club_id
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Brookweald CC setup complete!';
  RAISE NOTICE 'Club ID: %', v_club_id;
  RAISE NOTICE 'Season ID: %', v_season_id;
  RAISE NOTICE 'Team 1st XI ID: %', v_team_1st_id;
  RAISE NOTICE 'Team 2nd XI ID: %', v_team_2nd_id;
END $$;

-- Display summary
SELECT
  'Club: ' || c.name as info,
  'Teams: ' || COUNT(DISTINCT t.id) as teams,
  'Players: ' || COUNT(DISTINCT p.id) as players,
  'Seasons: ' || COUNT(DISTINCT s.id) as seasons
FROM public.clubs c
LEFT JOIN public.teams t ON t.club_id = c.id
LEFT JOIN public.players p ON p.club_id = c.id
LEFT JOIN public.seasons s ON s.club_id = c.id
WHERE c.slug = 'brookweald'
GROUP BY c.name;
