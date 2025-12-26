-- Allow admins and captains to update fielding cards
DROP POLICY IF EXISTS fielding_cards_update ON public.fielding_cards;

CREATE POLICY fielding_cards_update ON public.fielding_cards
  FOR UPDATE
  USING (
    public.has_management_permission(auth.uid(), (
      SELECT club_id FROM public.matches m WHERE m.id = match_id
    ))
  )
  WITH CHECK (
    public.has_management_permission(auth.uid(), (
      SELECT club_id FROM public.matches m WHERE m.id = match_id
    ))
  );
