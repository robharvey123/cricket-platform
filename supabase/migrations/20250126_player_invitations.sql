-- Add email and phone fields to players table
ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Create player_invitations table
CREATE TABLE IF NOT EXISTS public.player_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  invitation_method TEXT NOT NULL CHECK (invitation_method IN ('email', 'whatsapp', 'both')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  invited_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(player_id)
);

-- Enable RLS
ALTER TABLE public.player_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for player_invitations
CREATE POLICY player_invitations_select ON public.player_invitations
  FOR SELECT
  USING (
    club_id IN (
      SELECT club_id FROM public.user_org_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY player_invitations_insert ON public.player_invitations
  FOR INSERT
  WITH CHECK (
    club_id IN (
      SELECT club_id FROM public.user_org_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'captain')
    )
  );

CREATE POLICY player_invitations_update ON public.player_invitations
  FOR UPDATE
  USING (
    club_id IN (
      SELECT club_id FROM public.user_org_roles WHERE user_id = auth.uid()
    )
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_player_invitations_club_id ON public.player_invitations(club_id);
CREATE INDEX IF NOT EXISTS idx_player_invitations_player_id ON public.player_invitations(player_id);
CREATE INDEX IF NOT EXISTS idx_player_invitations_status ON public.player_invitations(status);

-- Add comment
COMMENT ON TABLE public.player_invitations IS 'Tracks player invitation status for onboarding';
