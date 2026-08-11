-- ============================================================
-- MIGRATION 033: Coach Conversations & Messages
-- ============================================================
-- AI Relationship Coach persistence (Sprint 5 / S5-B) — shared by the web
-- app and the mobile app (one account, one dataset).
--
-- Additive only: creates two NEW tables. No existing table is altered, no
-- data is deleted, and no RLS policy on an existing table is changed.
-- Blueprint tables/scoring are untouched.
--
-- updated_at maintenance: repo convention (see migration 005 + 006/007/008) —
-- a BEFORE UPDATE trigger using the existing update_updated_at_column()
-- function. Writers only UPDATE rows; the database stamps updated_at, so
-- client/server clock skew never wins and every writer stays consistent.
--
-- coach_messages is intentionally IMMUTABLE: it has SELECT + INSERT policies
-- but NO UPDATE/DELETE policies. A coaching transcript is append-only — the
-- history the coach sees must always be exactly what the user saw — and
-- conversation deletion removes its messages via ON DELETE CASCADE. (If a
-- future product need requires editing messages, add policies then.)

-- One row per coaching conversation, owned by a user.
CREATE TABLE IF NOT EXISTS coach_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New conversation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Conversation list is ordered by most-recent activity — covers the
-- mobile list query (user_id + updated_at DESC) as one index scan.
CREATE INDEX IF NOT EXISTS idx_coach_conversations_user_updated
  ON coach_conversations(user_id, updated_at DESC);

-- Append-only transcript within a conversation.
CREATE TABLE IF NOT EXISTS coach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES coach_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','coach')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Messages are read oldest-first; keeps a conversation's transcript cheap.
CREATE INDEX IF NOT EXISTS idx_coach_messages_conversation_created
  ON coach_messages(conversation_id, created_at);

-- Updated-at trigger (repo convention; function from migration 005).
CREATE TRIGGER set_coach_conversations_updated_at
  BEFORE UPDATE ON coach_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: conversations are private to their owner.
ALTER TABLE coach_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own coach conversations" ON coach_conversations
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users create own coach conversations" ON coach_conversations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own coach conversations" ON coach_conversations
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users delete own coach conversations" ON coach_conversations
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- RLS: messages are readable/insertable only through a conversation the user
-- owns. No UPDATE/DELETE policies — messages are immutable (see header).
ALTER TABLE coach_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own coach messages" ON coach_messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM coach_conversations c
    WHERE c.id = coach_messages.conversation_id AND c.user_id = auth.uid()
  ));
CREATE POLICY "Users create own coach messages" ON coach_messages
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM coach_conversations c
    WHERE c.id = coach_messages.conversation_id AND c.user_id = auth.uid()
  ));
