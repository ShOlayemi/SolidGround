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
