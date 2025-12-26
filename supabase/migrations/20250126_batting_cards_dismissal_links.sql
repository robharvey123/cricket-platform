-- Add dismissal attribution fields to batting cards
ALTER TABLE public.batting_cards
  ADD COLUMN IF NOT EXISTS dismissal_fielder_id UUID REFERENCES public.players(id),
  ADD COLUMN IF NOT EXISTS dismissal_bowler_id UUID REFERENCES public.players(id);

CREATE INDEX IF NOT EXISTS idx_batting_cards_dismissal_fielder ON public.batting_cards(dismissal_fielder_id);
CREATE INDEX IF NOT EXISTS idx_batting_cards_dismissal_bowler ON public.batting_cards(dismissal_bowler_id);
