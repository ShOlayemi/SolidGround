-- ============================================================
-- MIGRATION 006: Assessment Answers
-- ============================================================
-- Stores individual answers to assessment questions.
-- Each row is one answer to one question within one session.
-- The UNIQUE(session_id, question_id) constraint ensures one
-- answer per question per session (upsert semantics).

CREATE TABLE IF NOT EXISTS assessment_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  category TEXT NOT NULL,
  answer JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, question_id)
);

-- Add responses JSONB column to assessment_sessions for
-- a denormalized snapshot of all answers on completion.
ALTER TABLE assessment_sessions
  ADD COLUMN IF NOT EXISTS responses JSONB DEFAULT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assessment_answers_session_id
  ON assessment_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_assessment_answers_session_category
  ON assessment_answers(session_id, category);

-- Updated-at trigger for assessment_answers
CREATE TRIGGER set_assessment_answers_updated_at
  BEFORE UPDATE ON assessment_answers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: users can manage answers for their own sessions
-- (join through assessment_sessions where user_id = auth.uid())
ALTER TABLE assessment_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage answers for own sessions" ON assessment_answers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessment_sessions s
      WHERE s.id = assessment_answers.session_id
      AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessment_sessions s
      WHERE s.id = assessment_answers.session_id
      AND s.user_id = auth.uid()
    )
  );
