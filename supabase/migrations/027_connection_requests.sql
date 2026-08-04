-- Connection requests for user discovery
CREATE TABLE IF NOT EXISTS connection_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT connection_requests_not_self CHECK (from_user_id <> to_user_id),
  CONSTRAINT connection_requests_unique_pending UNIQUE (from_user_id, to_user_id, status)
);
CREATE INDEX IF NOT EXISTS connection_requests_to_status_idx ON connection_requests(to_user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS connection_requests_from_status_idx ON connection_requests(from_user_id, status, created_at DESC);
CREATE TRIGGER set_connection_requests_updated_at BEFORE UPDATE ON connection_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
ALTER TABLE connection_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read connection requests" ON connection_requests FOR SELECT TO authenticated USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
CREATE POLICY "Send connection requests" ON connection_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "Senders delete connection requests" ON connection_requests FOR DELETE TO authenticated USING (auth.uid() = from_user_id);
CREATE POLICY "Receivers respond to connection requests" ON connection_requests FOR UPDATE TO authenticated USING (auth.uid() = to_user_id) WITH CHECK (auth.uid() = to_user_id);
