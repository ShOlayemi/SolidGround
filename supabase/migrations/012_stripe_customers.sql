-- ============================================================
-- MIGRATION 012: Stripe Customers
-- ============================================================
CREATE TABLE IF NOT EXISTS stripe_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  stripe_customer_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_stripe_customers_user ON stripe_customers(user_id);
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own stripe customer" ON stripe_customers
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
