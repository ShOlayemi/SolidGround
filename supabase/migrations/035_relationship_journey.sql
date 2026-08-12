-- ============================================================
-- MIGRATION 035: Relationship Journey
-- ============================================================
-- Sprint 7 "Relationship Journey + Shared Growth Plan" persistence (owner
-- brief 2026-08-12) — shared by the web app and the mobile app (one
-- account, one dataset).
--
-- Additive only: creates THREE NEW tables. No existing table is altered, no
-- data is deleted, and no RLS policy on an existing table is changed.
-- Blueprint tables/scoring are untouched. All pairings/comparison vocabulary
-- is reused verbatim; the web app has NO journey/goal/reflection feature to
-- conflict with (audited 2026-08-12 — greenfield on both sides).
--
-- Conversation topics are DERIVED from comparison_reports.conversation_guides
-- (JSONB, generated server-side by the web's generateComparisonReport). The
-- mobile app syncs relationship_topics rows from that report; users only
-- write the status ('not_started' → 'discussed'). UNIQUE
-- (pairing_id, category_id, topic) makes the sync an idempotent upsert, so
-- a "Discussed" status survives report regeneration for any topic whose
-- string is unchanged.
--
-- Disconnect behavior (lead decision): relationship_topics and shared_goals
-- die with their pairing (ON DELETE CASCADE — shared data is revoked).
-- private_reflections is the user's OWN private data: pairing_id and
-- topic_id are ON DELETE SET NULL so the user keeps their private notes
-- after a disconnect (owner-only RLS regardless — the partner never sees
-- them, and the AI coach never receives them).
--
-- updated_at maintenance: repo convention (see migrations 005/008/033/034) —
-- BEFORE UPDATE triggers using the existing update_updated_at_column()
-- function. Writers only UPDATE rows; the database stamps updated_at.
-- ============================================================

-- relationship_topics: one row per pairing per conversation topic.
CREATE TABLE IF NOT EXISTS relationship_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pairing_id UUID NOT NULL REFERENCES pairings(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL,                      -- one of the 12 CATEGORY_ORDER ids (code, no FK)
  category_name TEXT NOT NULL,                    -- canonical CATEGORY_LABELS value
  topic TEXT NOT NULL,                            -- ConversationGuide.topic verbatim
  prompts JSONB NOT NULL DEFAULT '[]'::jsonb,     -- ConversationGuide.prompts verbatim
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','discussed')),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pairing_id, category_id, topic)
);
CREATE INDEX IF NOT EXISTS idx_relationship_topics_pairing
  ON relationship_topics(pairing_id);
-- Updated-at trigger (repo convention; function from migration 005).
CREATE TRIGGER set_relationship_topics_updated_at BEFORE UPDATE ON relationship_topics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
ALTER TABLE relationship_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partners read their relationship topics" ON relationship_topics FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM pairings p WHERE p.id = relationship_topics.pairing_id
    AND (p.inviter_user_id = auth.uid() OR p.invitee_user_id = auth.uid())));
CREATE POLICY "Partners create relationship topics" ON relationship_topics FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND EXISTS (SELECT 1 FROM pairings p WHERE p.id = relationship_topics.pairing_id
    AND (p.inviter_user_id = auth.uid() OR p.invitee_user_id = auth.uid())));
CREATE POLICY "Partners update relationship topics" ON relationship_topics FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM pairings p WHERE p.id = relationship_topics.pairing_id
    AND (p.inviter_user_id = auth.uid() OR p.invitee_user_id = auth.uid())));
-- No DELETE policy (mirrors pairings/pairing_invitations); rows die with the pairing via CASCADE.

-- private_reflections: owner-only, like coach_conversations (033). NEVER read by the
-- partner and NEVER sent to the coach.
CREATE TABLE IF NOT EXISTS private_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pairing_id UUID REFERENCES pairings(id) ON DELETE SET NULL,        -- LEAD DECISION: preserve the user's own reflection after disconnect
  topic_id UUID REFERENCES relationship_topics(id) ON DELETE SET NULL, -- LEAD DECISION: preserve on topic/pairing removal
  category_id TEXT,                                                  -- one of the 12, when topic-scoped
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_private_reflections_user_pairing
  ON private_reflections(user_id, pairing_id);
-- Updated-at trigger (repo convention; function from migration 005).
CREATE TRIGGER set_private_reflections_updated_at BEFORE UPDATE ON private_reflections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
ALTER TABLE private_reflections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own reflections" ON private_reflections FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create own reflections" ON private_reflections FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own reflections" ON private_reflections FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own reflections" ON private_reflections FOR DELETE TO authenticated USING (auth.uid() = user_id);
-- Owner-only RLS: a non-owner (including the partner) receives NO data regardless of pairing state.

-- shared_goals: visible to both participants; created_by records who created it.
CREATE TABLE IF NOT EXISTS shared_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pairing_id UUID NOT NULL REFERENCES pairings(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  domain TEXT,                                  -- one of the 12 category ids or NULL
  target_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shared_goals_pairing_status
  ON shared_goals(pairing_id, status);
-- Updated-at trigger (repo convention; function from migration 005).
CREATE TRIGGER set_shared_goals_updated_at BEFORE UPDATE ON shared_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
ALTER TABLE shared_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partners read their shared goals" ON shared_goals FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM pairings p WHERE p.id = shared_goals.pairing_id
    AND (p.inviter_user_id = auth.uid() OR p.invitee_user_id = auth.uid())));
CREATE POLICY "Partners create shared goals" ON shared_goals FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND EXISTS (SELECT 1 FROM pairings p WHERE p.id = shared_goals.pairing_id
    AND (p.inviter_user_id = auth.uid() OR p.invitee_user_id = auth.uid())));
CREATE POLICY "Partners update shared goals" ON shared_goals FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM pairings p WHERE p.id = shared_goals.pairing_id
    AND (p.inviter_user_id = auth.uid() OR p.invitee_user_id = auth.uid())));
CREATE POLICY "Partners delete shared goals" ON shared_goals FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM pairings p WHERE p.id = shared_goals.pairing_id
    AND (p.inviter_user_id = auth.uid() OR p.invitee_user_id = auth.uid())));
-- DELETE policy: both partners may remove a goal (UI provides delete).
