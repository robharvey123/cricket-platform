-- ============================================
-- MIGRATION 001: Core Tables
-- ============================================

-- Organizations (Cricket Clubs)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,

  -- Play-Cricket Integration
  pc_site_id TEXT,
  pc_last_sync_at TIMESTAMPTZ,

  -- Subscription
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_tier TEXT DEFAULT 'free',
  feature_flags JSONB DEFAULT '{
    "tier": "free",
    "max_players": 25,
    "max_teams": 1,
    "features": {
      "availability_polling": false,
      "team_selection": false,
      "club_payments": false,
      "ai_analyst": false,
      "mega_stats": false
    }
  }'::jsonb,

  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  avatar_url TEXT,

  -- Organization & Role
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  role TEXT DEFAULT 'player' CHECK (role IN ('admin', 'captain', 'treasurer', 'scorer', 'player')),

  -- Cricket Profile
  can_keep_wicket BOOLEAN DEFAULT false,
  preferred_batting_position INT,
  bowling_type TEXT CHECK (bowling_type IN ('pace', 'medium', 'spin', 'none', NULL)),

  -- Payment
  stripe_customer_id TEXT,
  payment_balance DECIMAL(10,2) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teams (1st XI, 2nd XI, etc.)
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  short_name TEXT,
  is_primary BOOLEAN DEFAULT false,
  season TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(org_id, name)
);

-- Matches
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id),

  opponent TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME,
  venue TEXT,
  is_home BOOLEAN DEFAULT true,

  -- Play-Cricket
  pc_match_id TEXT,

  -- Status
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  result TEXT,

  -- Selection & Availability
  availability_deadline TIMESTAMPTZ,
  selection_status TEXT DEFAULT 'pending' CHECK (selection_status IN ('pending', 'draft', 'published')),

  -- Payments
  match_fee_amount DECIMAL(10,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invitations
CREATE TABLE IF NOT EXISTS invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'captain', 'treasurer', 'scorer', 'player')),
  invited_by UUID NOT NULL REFERENCES profiles(id),

  token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),

  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES profiles(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_org ON profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_teams_org ON teams(org_id);
CREATE INDEX IF NOT EXISTS idx_matches_org ON matches(org_id);
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(date);
CREATE INDEX IF NOT EXISTS idx_invites_token ON invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_email ON invites(email);
CREATE INDEX IF NOT EXISTS idx_org_pc_site_id ON organizations(pc_site_id);
