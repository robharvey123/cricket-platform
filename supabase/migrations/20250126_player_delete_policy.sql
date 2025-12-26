-- Allow admins to delete players
DROP POLICY IF EXISTS players_delete ON public.players;

CREATE POLICY players_delete ON public.players
  FOR DELETE
  USING (
    public.is_admin(auth.uid(), club_id)
  );
