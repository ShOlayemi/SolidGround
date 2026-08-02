-- ============================================================
-- MIGRATION 016: Invoice History
-- ============================================================
CREATE TABLE IF NOT EXISTS invoice_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT UNIQUE,
  stripe_invoice_url TEXT,
  amount_paid INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'open', 'void', 'uncollectible')),
  invoice_pdf_url TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_invoice_history_user ON invoice_history(user_id);
ALTER TABLE invoice_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own invoice history" ON invoice_history
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
