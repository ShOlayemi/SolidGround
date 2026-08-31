-- 040_push_tokens.sql
-- Sprint step: Expo Push Notifications — device push-token registry (ADD-only).
-- Exported-push side of in-app notifications. NEW table only — no existing
-- table, data, RLS policy, or behavior is touched.
--
-- One row per user (UNIQUE(user_id)); the mobile client registers/updates its
-- Expo push token here via POST /api/push/register so the server can send
-- fire-and-forget push notifications for the SAME events that already produce
-- in-app notifications (connection_request, connection_accepted,
-- invite_accepted, assessment_complete, new_message).
CREATE TABLE IF NOT EXISTS push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  expo_push_token text NOT NULL,
  platform text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT push_tokens_platform_check CHECK (platform IS NULL OR platform IN ('ios', 'android'))
);
CREATE INDEX IF NOT EXISTS push_tokens_user_id_idx ON push_tokens(user_id);

-- Auto-maintain updated_at on token changes (mirrors other tables).
CREATE TRIGGER set_push_tokens_updated_at
BEFORE UPDATE ON push_tokens
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security: each authenticated user may read, insert, and update
-- ONLY their own row (authorization at the DB level — never from a
-- client-supplied user id). The server's service client performs cross-user
-- reads for pushing.
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own push token"
  ON push_tokens FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own push token"
  ON push_tokens FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own push token"
  ON push_tokens FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own push token"
  ON push_tokens FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
