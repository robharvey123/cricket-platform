-- ============================================
-- MIGRATION 002: Availability & Selection
-- ============================================

-- Availability responses
CREATE TABLE IF NOT EXISTS availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  status TEXT NOT NULL CHECK (status IN ('available', 'unavailable', 'maybe')),
  reason TEXT,

  responded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(match_id, profile_id)
);

-- Team selections
CREATE TABLE IF NOT EXISTS selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  batting_position INT,
  role TEXT, -- 'captain', 'wicketkeeper', 'opening_bat', etc.
  is_reserve BOOLEAN DEFAULT false,

  status TEXT DEFAULT 'selected' CHECK (status IN ('selected', 'confirmed', 'withdrawn')),
  notified_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(match_id, profile_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_availability_match ON availability(match_id);
CREATE INDEX IF NOT EXISTS idx_availability_profile ON availability(profile_id);
CREATE INDEX IF NOT EXISTS idx_selections_match ON selections(match_id);
