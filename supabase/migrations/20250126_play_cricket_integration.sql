-- Play Cricket API Integration
-- Adds fields and tables for Play Cricket sync functionality

-- ============================================================================
-- Add Play Cricket fields to clubs table
-- ============================================================================
ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS play_cricket_site_id TEXT,
  ADD COLUMN IF NOT EXISTS play_cricket_api_token TEXT, -- Will be encrypted in app
  ADD COLUMN IF NOT EXISTS play_cricket_sync_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS play_cricket_last_sync TIMESTAMPTZ;

-- ============================================================================
-- Play Cricket Sync Logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.play_cricket_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL, -- 'manual', 'scheduled', 'initial'
  season_year INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed'
  matches_found INT DEFAULT 0,
  matches_imported INT DEFAULT 0,
  matches_updated INT DEFAULT 0,
  matches_skipped INT DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_play_cricket_sync_logs_club_id ON public.play_cricket_sync_logs(club_id);
CREATE INDEX IF NOT EXISTS idx_play_cricket_sync_logs_status ON public.play_cricket_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_play_cricket_sync_logs_season ON public.play_cricket_sync_logs(season_year);

ALTER TABLE public.play_cricket_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sync logs
DROP POLICY IF EXISTS "Admins can view sync logs" ON public.play_cricket_sync_logs;
CREATE POLICY "Admins can view sync logs"
  ON public.play_cricket_sync_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_org_roles
      WHERE user_id = auth.uid()
        AND club_id = play_cricket_sync_logs.club_id
        AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can create sync logs" ON public.play_cricket_sync_logs;
CREATE POLICY "Admins can create sync logs"
  ON public.play_cricket_sync_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_org_roles
      WHERE user_id = auth.uid()
        AND club_id = play_cricket_sync_logs.club_id
        AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update sync logs" ON public.play_cricket_sync_logs;
CREATE POLICY "Admins can update sync logs"
  ON public.play_cricket_sync_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_org_roles
      WHERE user_id = auth.uid()
        AND club_id = play_cricket_sync_logs.club_id
        AND role = 'admin'
    )
  );

-- ============================================================================
-- Player Conflict Resolution Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.play_cricket_player_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  play_cricket_player_id INT NOT NULL,
  play_cricket_player_name TEXT NOT NULL,
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
  mapping_status TEXT DEFAULT 'pending', -- 'pending', 'mapped', 'ignored'
  confidence_score NUMERIC(3,2), -- 0.00 to 1.00
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(club_id, play_cricket_player_id)
);

CREATE INDEX IF NOT EXISTS idx_pc_player_mappings_club_id ON public.play_cricket_player_mappings(club_id);
CREATE INDEX IF NOT EXISTS idx_pc_player_mappings_player_id ON public.play_cricket_player_mappings(player_id);
CREATE INDEX IF NOT EXISTS idx_pc_player_mappings_status ON public.play_cricket_player_mappings(mapping_status);

ALTER TABLE public.play_cricket_player_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for player mappings
DROP POLICY IF EXISTS "Admins can manage player mappings" ON public.play_cricket_player_mappings;
CREATE POLICY "Admins can manage player mappings"
  ON public.play_cricket_player_mappings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_org_roles
      WHERE user_id = auth.uid()
        AND club_id = play_cricket_player_mappings.club_id
        AND role = 'admin'
    )
  );

-- ============================================================================
-- Update matches table source column to include play_cricket
-- ============================================================================
COMMENT ON COLUMN public.matches.source IS 'Source of match data: manual, pdf, play_cricket';

-- ============================================================================
-- Helper function to get or create player from Play Cricket data
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_or_create_play_cricket_player(
  p_club_id UUID,
  p_pc_player_id INT,
  p_player_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_player_id UUID;
  v_first_name TEXT;
  v_last_name TEXT;
  v_name_parts TEXT[];
BEGIN
  -- Check if we have an existing mapping
  SELECT player_id INTO v_player_id
  FROM public.play_cricket_player_mappings
  WHERE club_id = p_club_id
    AND play_cricket_player_id = p_pc_player_id
    AND mapping_status = 'mapped'
    AND player_id IS NOT NULL;

  IF v_player_id IS NOT NULL THEN
    RETURN v_player_id;
  END IF;

  -- Split name into first and last
  v_name_parts := string_to_array(trim(p_player_name), ' ');

  IF array_length(v_name_parts, 1) = 1 THEN
    v_first_name := v_name_parts[1];
    v_last_name := v_name_parts[1];
  ELSE
    v_first_name := v_name_parts[1];
    v_last_name := array_to_string(v_name_parts[2:array_length(v_name_parts, 1)], ' ');
  END IF;

  -- Try to find existing player by full name match
  SELECT id INTO v_player_id
  FROM public.players
  WHERE club_id = p_club_id
    AND (
      full_name ILIKE p_player_name
      OR (first_name ILIKE v_first_name AND last_name ILIKE v_last_name)
    )
  LIMIT 1;

  -- If not found, create new player
  IF v_player_id IS NULL THEN
    INSERT INTO public.players (
      club_id,
      first_name,
      last_name,
      external_ids,
      status
    ) VALUES (
      p_club_id,
      v_first_name,
      v_last_name,
      jsonb_build_object('play_cricket_id', p_pc_player_id),
      'active'
    )
    RETURNING id INTO v_player_id;
  ELSE
    -- Update existing player with Play Cricket ID
    UPDATE public.players
    SET external_ids = COALESCE(external_ids, '{}'::jsonb) || jsonb_build_object('play_cricket_id', p_pc_player_id)
    WHERE id = v_player_id;
  END IF;

  -- Create or update mapping
  INSERT INTO public.play_cricket_player_mappings (
    club_id,
    play_cricket_player_id,
    play_cricket_player_name,
    player_id,
    mapping_status,
    confidence_score
  ) VALUES (
    p_club_id,
    p_pc_player_id,
    p_player_name,
    v_player_id,
    'mapped',
    1.00
  )
  ON CONFLICT (club_id, play_cricket_player_id)
  DO UPDATE SET
    player_id = v_player_id,
    mapping_status = 'mapped',
    updated_at = NOW();

  RETURN v_player_id;
END;
$$;
