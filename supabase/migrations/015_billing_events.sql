-- ============================================================
-- MIGRATION 015: Billing Events
-- ============================================================
CREATE TABLE IF NOT EXISTS billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_billing_events_user ON billing_events(user_id);
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own billing events" ON billing_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
