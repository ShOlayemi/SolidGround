-- ============================================================
-- SolidGround AI — Supabase SQL Editor Migration Runner
-- ============================================================
-- Copy this entire file and paste into Supabase SQL Editor.
-- Migrations 001-008 are already applied in Supabase production.
-- This file contains only the pending migrations 009-017, in order.
-- ============================================================

-- ============================================================
-- MIGRATION 009: AI Insights
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  blueprint_summary TEXT NOT NULL,
  personal_strengths JSONB NOT NULL,
  growth_opportunities JSONB NOT NULL,
  reflection_questions JSONB NOT NULL,
  communication_recommendations JSONB NOT NULL,
  relationship_readiness JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id)
);
CREATE INDEX IF NOT EXISTS idx_ai_insights_user_id ON ai_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_session_id ON ai_insights(session_id);
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own ai insights" ON ai_insights FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service inserts ai insights" ON ai_insights FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- MIGRATION 010: Comparison Reports
-- ============================================================
CREATE TABLE IF NOT EXISTS comparison_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pairing_id UUID NOT NULL REFERENCES pairings(id) ON DELETE CASCADE UNIQUE,
  overall_compatibility INTEGER NOT NULL CHECK (overall_compatibility >= 0 AND overall_compatibility <= 100),
  category_comparisons JSONB NOT NULL,
  shared_strengths JSONB NOT NULL,
  potential_conflicts JSONB NOT NULL,
  conversation_guides JSONB NOT NULL,
  growth_opportunities JSONB NOT NULL,
  deal_breaker_intersections JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_comparison_reports_pairing ON comparison_reports(pairing_id);
ALTER TABLE comparison_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partners read their comparison reports" ON comparison_reports FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM pairings p WHERE p.id = comparison_reports.pairing_id AND (p.inviter_user_id = auth.uid() OR p.invitee_user_id = auth.uid())));
CREATE POLICY "Service inserts comparison reports" ON comparison_reports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Service updates comparison reports" ON comparison_reports FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM pairings p WHERE p.id = comparison_reports.pairing_id AND (p.inviter_user_id = auth.uid() OR p.invitee_user_id = auth.uid())));

-- ============================================================
-- MIGRATION 011: Pairing Messages
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
CREATE POLICY "Partners read their messages" ON pairing_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM pairings p WHERE p.id = pairing_messages.pairing_id AND (p.inviter_user_id = auth.uid() OR p.invitee_user_id = auth.uid())));
CREATE POLICY "Partners insert messages" ON pairing_messages FOR INSERT TO authenticated WITH CHECK (sender_user_id = auth.uid() AND EXISTS (SELECT 1 FROM pairings p WHERE p.id = pairing_messages.pairing_id AND (p.inviter_user_id = auth.uid() OR p.invitee_user_id = auth.uid())));

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
CREATE POLICY "Users read own stripe customer" ON stripe_customers FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- MIGRATION 013: Subscriptions
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  plan_tier TEXT NOT NULL CHECK (plan_tier IN ('free', 'premium_monthly', 'premium_annual')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'incomplete', 'trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own subscriptions" ON subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- MIGRATION 014: Payments
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_invoice_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'succeeded' CHECK (status IN ('succeeded', 'failed', 'refunded', 'pending')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_user ON payments(user_id);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own payments" ON payments FOR SELECT TO authenticated USING (auth.uid() = user_id);

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
CREATE POLICY "Users read own billing events" ON billing_events FOR SELECT TO authenticated USING (auth.uid() = user_id);

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
CREATE POLICY "Users read own invoice history" ON invoice_history FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- MIGRATION 017: Admin Roles & Audit Log
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator', 'support'));
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_admin ON admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_log(created_at);
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read audit log" ON admin_audit_log FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator')));
CREATE POLICY "Admins insert audit log" ON admin_audit_log FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator')));
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

-- ============================================================
-- MIGRATION 034: Pairing Invitations
-- ============================================================
-- Invitation lifecycle for two-person compatibility (Sprint 6 / S6-1) —
-- shared by the web app and the mobile app (one account, one dataset).
--
-- Additive only: creates ONE new table. No existing table is altered, no
-- data is deleted, and no RLS policy on an existing table is changed.
-- Blueprint tables/scoring are untouched. The pairings table is NOT
-- modified: it keeps its existing UPDATE policy (inviter-or-invitee) and
-- deliberately NO DELETE policy — accept and disconnect run server-side
-- through the mobile-facing API routes using the service client, because
-- RLS cannot express either operation:
--   • accept: pairings.invitee_user_id is NULL until accept, so the
--     UPDATE policy (auth.uid() = inviter OR invitee) excludes the
--     recipient; the anon-key "pending pairing by code" SELECT policy
--     would also leak every pairing column to anyone holding the code,
--     so the mobile client never reads pairings by code directly.
--   • disconnect: pairings has no DELETE policy at all.
--
-- Lifecycle: created (pending) → accepted | declined | cancelled | expired.
-- The row dies with its pairing via ON DELETE CASCADE (a disconnect deletes
-- the pairing, which removes its invitation row too); there is deliberately
-- NO DELETE policy on this table.
--
-- invite_token reuses the pairings.invite_code value (the same 8-char share
-- token) so a single code resolves both the pairing and its lifecycle row
-- (UNIQUE on invite_token mirrors UNIQUE on pairings.invite_code).
-- expires_at defaults to 7 days; the accept route rejects expired invites.
-- invitee_email is nullable for parity with the web app's email-invite flow.
--
-- updated_at maintenance: repo convention (see migrations 005/008/033) —
-- a BEFORE UPDATE trigger using the existing update_updated_at_column()
-- function. Writers only UPDATE rows; the database stamps updated_at.
-- ============================================================
CREATE TABLE IF NOT EXISTS pairing_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pairing_id UUID NOT NULL REFERENCES pairings(id) ON DELETE CASCADE,
  inviter_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invite_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
  invitee_email TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- (invite_token) index is implicit via UNIQUE. Keep the pairing and
-- expiry lookups cheap: invitations are always addressed by pairing or
-- by status+expiry (e.g. "expire stale pending invites").
CREATE INDEX IF NOT EXISTS idx_pairing_invitations_inviter
  ON pairing_invitations(inviter_user_id);
CREATE INDEX IF NOT EXISTS idx_pairing_invitations_status_expires
  ON pairing_invitations(status, expires_at);
-- Updated-at trigger (repo convention; function from migration 005).
CREATE TRIGGER set_pairing_invitations_updated_at
  BEFORE UPDATE ON pairing_invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- RLS: the inviter, or either participant of the underlying pairing, may
-- read/update the lifecycle row (consistent with the pairings policies).
-- The pairing join is the source of truth for "who may see this" —
-- the invitee only exists in pairings AFTER accept, so a pending
-- invitation's recipient cannot (and need not) touch the row via RLS:
-- accept is performed server-side by the mobile API route with the
-- service client (see header for why). The status CHECK keeps writes
-- to the intended lifecycle transitions.
ALTER TABLE pairing_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own pairing invitations" ON pairing_invitations
  FOR SELECT TO authenticated
  USING (
    auth.uid() = inviter_user_id
    OR EXISTS (
      SELECT 1 FROM pairings p
      WHERE p.id = pairing_invitations.pairing_id
      AND (p.inviter_user_id = auth.uid() OR p.invitee_user_id = auth.uid())
    )
  );
CREATE POLICY "Users create pairing invitations" ON pairing_invitations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = inviter_user_id);
CREATE POLICY "Users update pairing invitations" ON pairing_invitations
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = inviter_user_id
    OR EXISTS (
      SELECT 1 FROM pairings p
      WHERE p.id = pairing_invitations.pairing_id
      AND (p.inviter_user_id = auth.uid() OR p.invitee_user_id = auth.uid())
    )
  );

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
