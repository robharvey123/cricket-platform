-- ============================================
-- MIGRATION 006: Functions & Triggers
-- ============================================

-- ============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
  club_name TEXT;
  pc_site_id TEXT;
BEGIN
  -- Get metadata from signup
  club_name := NEW.raw_user_meta_data->>'clubName';
  pc_site_id := NEW.raw_user_meta_data->>'pcSiteId';

  -- If creating a new club (has clubName in metadata)
  IF club_name IS NOT NULL THEN
    -- Create organization
    INSERT INTO public.organizations (name, slug, pc_site_id)
    VALUES (
      club_name,
      LOWER(REGEXP_REPLACE(club_name, '[^a-zA-Z0-9]+', '-', 'g')),
      NULLIF(pc_site_id, '')
    )
    RETURNING id INTO new_org_id;

    -- Create profile as admin
    INSERT INTO public.profiles (id, email, name, org_id, role)
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'name',
      new_org_id,
      'admin'
    );
  ELSE
    -- User is being invited to existing org (profile created by invite acceptance)
    -- Create minimal profile that will be updated
    INSERT INTO public.profiles (id, email, name)
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'name'
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- UPDATE TIMESTAMPS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- RECALCULATE SEASON STATS
-- ============================================

CREATE OR REPLACE FUNCTION recalculate_season_stats(p_profile_id UUID, p_season TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO player_season_stats (
    org_id, profile_id, season,
    matches_batted, innings, not_outs, runs_total, highest_score,
    batting_average, strike_rate, fifties, hundreds,
    overs_total, wickets_total, runs_conceded_total,
    bowling_average, economy_rate, five_wicket_hauls,
    catches_total, run_outs_total, stumpings_total,
    mvp_points_total
  )
  SELECT
    ps.org_id,
    ps.profile_id,
    p_season,
    COUNT(CASE WHEN runs_scored > 0 OR how_out IS NOT NULL THEN 1 END),
    COUNT(CASE WHEN runs_scored > 0 OR how_out IS NOT NULL THEN 1 END),
    COUNT(CASE WHEN how_out = 'not_out' THEN 1 END),
    COALESCE(SUM(runs_scored), 0),
    COALESCE(MAX(runs_scored), 0),
    CASE
      WHEN COUNT(*) - COUNT(CASE WHEN how_out = 'not_out' THEN 1 END) > 0
      THEN ROUND(SUM(runs_scored)::numeric / (COUNT(*) - COUNT(CASE WHEN how_out = 'not_out' THEN 1 END)), 2)
      ELSE NULL
    END,
    CASE
      WHEN SUM(balls_faced) > 0
      THEN ROUND((SUM(runs_scored)::numeric / SUM(balls_faced)) * 100, 2)
      ELSE NULL
    END,
    COUNT(CASE WHEN runs_scored >= 50 AND runs_scored < 100 THEN 1 END),
    COUNT(CASE WHEN runs_scored >= 100 THEN 1 END),
    COALESCE(SUM(overs_bowled), 0),
    COALESCE(SUM(wickets_taken), 0),
    COALESCE(SUM(runs_conceded), 0),
    CASE
      WHEN SUM(wickets_taken) > 0
      THEN ROUND(SUM(runs_conceded)::numeric / SUM(wickets_taken), 2)
      ELSE NULL
    END,
    CASE
      WHEN SUM(overs_bowled) > 0
      THEN ROUND(SUM(runs_conceded)::numeric / SUM(overs_bowled), 2)
      ELSE NULL
    END,
    COUNT(CASE WHEN wickets_taken >= 5 THEN 1 END),
    COALESCE(SUM(catches), 0),
    COALESCE(SUM(run_outs), 0),
    COALESCE(SUM(stumpings), 0),
    COALESCE(SUM(mvp_points), 0)
  FROM player_stats ps
  JOIN matches m ON ps.match_id = m.id
  WHERE ps.profile_id = p_profile_id
    AND EXTRACT(YEAR FROM m.date)::text = p_season
  GROUP BY ps.org_id, ps.profile_id
  ON CONFLICT (profile_id, season) DO UPDATE SET
    matches_batted = EXCLUDED.matches_batted,
    innings = EXCLUDED.innings,
    not_outs = EXCLUDED.not_outs,
    runs_total = EXCLUDED.runs_total,
    highest_score = EXCLUDED.highest_score,
    batting_average = EXCLUDED.batting_average,
    strike_rate = EXCLUDED.strike_rate,
    fifties = EXCLUDED.fifties,
    hundreds = EXCLUDED.hundreds,
    overs_total = EXCLUDED.overs_total,
    wickets_total = EXCLUDED.wickets_total,
    runs_conceded_total = EXCLUDED.runs_conceded_total,
    bowling_average = EXCLUDED.bowling_average,
    economy_rate = EXCLUDED.economy_rate,
    five_wicket_hauls = EXCLUDED.five_wicket_hauls,
    catches_total = EXCLUDED.catches_total,
    run_outs_total = EXCLUDED.run_outs_total,
    stumpings_total = EXCLUDED.stumpings_total,
    mvp_points_total = EXCLUDED.mvp_points_total,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
