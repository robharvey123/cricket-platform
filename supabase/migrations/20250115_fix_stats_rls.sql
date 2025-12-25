-- Allow inserts/updates for stats tables scoped to user's club

CREATE POLICY player_season_stats_insert_v2 ON public.player_season_stats
  FOR INSERT WITH CHECK (
    club_id IN (
      SELECT club_id FROM public.user_org_roles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY player_season_stats_update_v2 ON public.player_season_stats
  FOR UPDATE USING (
    club_id IN (
      SELECT club_id FROM public.user_org_roles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY player_match_performance_insert_v2 ON public.player_match_performance
  FOR INSERT WITH CHECK (
    club_id IN (
      SELECT club_id FROM public.user_org_roles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY player_match_performance_update_v2 ON public.player_match_performance
  FOR UPDATE USING (
    club_id IN (
      SELECT club_id FROM public.user_org_roles
      WHERE user_id = auth.uid()
    )
  );
