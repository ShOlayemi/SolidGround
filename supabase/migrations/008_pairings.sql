-- ============================================================
-- MIGRATION 008: Pairings
-- ============================================================
-- Pairwise Alignment Match™ — lets users compare their
-- Compatibility Blueprint with a partner's.
-- ============================================================

CREATE TABLE IF NOT EXISTS pairings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code TEXT NOT NULL UNIQUE,
  inviter_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  inviter_session_id UUID NOT NULL REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  invitee_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  invitee_session_id UUID REFERENCES assessment_sessions(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed')),
  alignment_results JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pairings_invite_code ON pairings(invite_code);
CREATE INDEX IF NOT EXISTS idx_pairings_inviter ON pairings(inviter_user_id);
CREATE INDEX IF NOT EXISTS idx_pairings_invitee ON pairings(invitee_user_id);

CREATE TRIGGER set_pairings_updated_at
  BEFORE UPDATE ON pairings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE pairings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own pairings" ON pairings
  FOR SELECT TO authenticated
  USING (auth.uid() = inviter_user_id OR auth.uid() = invitee_user_id);

CREATE POLICY "Users insert pairings" ON pairings
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = inviter_user_id);

CREATE POLICY "Users update own pairings" ON pairings
  FOR UPDATE TO authenticated
  USING (auth.uid() = inviter_user_id OR auth.uid() = invitee_user_id);
