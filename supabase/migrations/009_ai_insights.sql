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

CREATE POLICY "Users read own ai insights" ON ai_insights
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service inserts ai insights" ON ai_insights
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
