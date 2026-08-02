-- ============================================================
-- MIGRATION 011: Pairing Messages
-- ============================================================
-- Partner chat infrastructure for paired users to discuss
-- their compatibility results and conversation guides.
-- ============================================================

CREATE TABLE IF NOT EXISTS pairing_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pairing_id UUID NOT NULL REFERENCES pairings(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pairing_messages_pairing ON pairing_messages(pairing_id);
CREATE INDEX idx_pairing_messages_created ON pairing_messages(pairing_id, created_at);

ALTER TABLE pairing_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners read their messages" ON pairing_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pairings p
      WHERE p.id = pairing_messages.pairing_id
      AND (p.inviter_user_id = auth.uid() OR p.invitee_user_id = auth.uid())
    )
  );

CREATE POLICY "Partners insert messages" ON pairing_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM pairings p
      WHERE p.id = pairing_messages.pairing_id
      AND (p.inviter_user_id = auth.uid() OR p.invitee_user_id = auth.uid())
    )
  );
