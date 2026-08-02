-- ============================================================
-- MIGRATION 007: Blueprint Results
-- ============================================================
-- Stores computed Compatibility Blueprint™ results.
-- One row per completed assessment session (UNIQUE on session_id).
-- JSONB stores all 12 category results for flexible querying.

CREATE TABLE IF NOT EXISTS blueprint_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_results JSONB NOT NULL,
  overall_score INTEGER NOT NULL,
  overall_confidence INTEGER NOT NULL,
  weight_config JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_blueprint_results_user_id
  ON blueprint_results(user_id);
CREATE INDEX IF NOT EXISTS idx_blueprint_results_session_id
  ON blueprint_results(session_id);

-- Updated-at trigger
CREATE TRIGGER set_blueprint_results_updated_at
  BEFORE UPDATE ON blueprint_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: users can read own results, service can insert/update
ALTER TABLE blueprint_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own blueprint results" ON blueprint_results
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service inserts blueprint results" ON blueprint_results
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service updates blueprint results" ON blueprint_results
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
