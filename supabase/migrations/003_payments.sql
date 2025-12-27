-- ============================================
-- MIGRATION 003: Payments
-- ============================================

-- Payment requests (what members owe)
CREATE TABLE IF NOT EXISTS payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,

  type TEXT NOT NULL CHECK (type IN ('match_fee', 'subscription', 'fine', 'levy', 'other')),
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE,

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'waived', 'cancelled')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

-- Payment records
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  payment_request_id UUID REFERENCES payment_requests(id) ON DELETE SET NULL,

  stripe_payment_id TEXT,
  stripe_invoice_id TEXT,

  amount DECIMAL(10,2) NOT NULL,
  method TEXT DEFAULT 'card' CHECK (method IN ('card', 'cash', 'bank_transfer', 'other')),
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'refunded', 'failed')),

  notes TEXT,
  recorded_by UUID REFERENCES profiles(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_requests_org ON payment_requests(org_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_profile ON payment_requests(profile_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payments_org ON payments(org_id);
