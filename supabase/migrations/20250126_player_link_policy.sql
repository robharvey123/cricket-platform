-- Allow admins to link/unlink players to users
DROP POLICY IF EXISTS players_update_admin_link ON public.players;

CREATE POLICY players_update_admin_link ON public.players
  FOR UPDATE
  USING (
    public.is_admin(auth.uid(), club_id)
  )
  WITH CHECK (
    public.is_admin(auth.uid(), club_id)
  );
