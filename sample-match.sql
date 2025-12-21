-- Sample Match Data for Testing
-- This creates a match with realistic cricket data that you can use to test the system

-- First, let's verify your club and season IDs
-- Run this in Supabase SQL Editor to see your IDs:
-- SELECT id, name FROM clubs;
-- SELECT id, name FROM seasons;
-- SELECT id, name FROM teams;

-- Assuming you have:
-- - A club (from seed data or created)
-- - A season (from seed data or created)
-- - A team (from seed data or created)
-- - Some players (from seed data or created)

-- STEP 1: Insert a sample match
-- Replace these UUIDs with your actual IDs from the queries above
DO $$
DECLARE
  v_club_id UUID;
  v_season_id UUID;
  v_team_id UUID;
  v_match_id UUID;
  v_innings_id UUID;
BEGIN
  -- Get your actual IDs (adjust these queries based on your data)
  SELECT id INTO v_club_id FROM clubs LIMIT 1;
  SELECT id INTO v_season_id FROM seasons WHERE club_id = v_club_id LIMIT 1;
  SELECT id INTO v_team_id FROM teams WHERE club_id = v_club_id LIMIT 1;

  -- Create a sample match
  INSERT INTO matches (
    club_id,
    season_id,
    team_id,
    match_date,
    opponent,
    venue,
    competition,
    result,
    source,
    published
  ) VALUES (
    v_club_id,
    v_season_id,
    v_team_id,
    CURRENT_DATE - INTERVAL '7 days',
    'Riverside CC',
    'Home Ground',
    'League Match',
    'Won by 45 runs',
    'manual',
    false  -- Start as unpublished
  ) RETURNING id INTO v_match_id;

  -- Create innings
  INSERT INTO innings (
    match_id,
    innings_number,
    batting_team,
    total_runs,
    total_wickets,
    overs,
    balls,
    extras_byes,
    extras_leg_byes,
    extras_wides,
    extras_no_balls,
    extras_penalties,
    declared,
    forfeited
  ) VALUES (
    v_match_id,
    1,
    'Your Team',
    185,
    7,
    40,
    0,
    4,
    2,
    8,
    3,
    0,
    false,
    false
  ) RETURNING id INTO v_innings_id;

  -- Insert some sample batting cards
  -- You'll need to replace these with actual player IDs from your players table
  -- For now, we'll just create the structure

  RAISE NOTICE 'Sample match created with ID: %', v_match_id;
  RAISE NOTICE 'Now go to your app and navigate to /admin/matches to see it!';
  RAISE NOTICE 'You can then publish it to calculate points.';
END $$;
