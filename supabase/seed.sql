-- Seed Data: Brookweald Cricket Club
-- Run this after the migration to set up your first club

-- Create Brookweald CC
INSERT INTO public.clubs (name, slug, brand, tier, billing_status)
VALUES (
  'Brookweald Cricket Club',
  'brookweald',
  '{"primary_color": "#0ea5e9", "secondary_color": "#1e293b", "logo_url": null}'::jsonb,
  'club',
  'active'
)
ON CONFLICT (slug) DO NOTHING
RETURNING id;

-- Note: Save the returned id and use it below, or query it:
-- SELECT id FROM public.clubs WHERE slug = 'brookweald';

-- Example: Create default teams (replace <club_id> with actual ID)
/*
INSERT INTO public.teams (club_id, name, competition)
VALUES
  ('<club_id>', '1st XI', 'Saturday League'),
  ('<club_id>', '2nd XI', 'Sunday League')
ON CONFLICT DO NOTHING;

-- Example: Create current season
INSERT INTO public.seasons (club_id, name, start_date, end_date, is_active)
VALUES
  ('<club_id>', '2025 Season', '2025-04-01', '2025-09-30', TRUE)
ON CONFLICT DO NOTHING;

-- Example: Add default scoring config
INSERT INTO public.scoring_configs (club_id, name, version, formula_json, is_active)
VALUES
  ('<club_id>', 'Default Scoring', 1, '{
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
*/
