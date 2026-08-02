-- Migration 021: Feedback, Feature Requests & NPS
-- Unified inbox for user feedback: bug reports, feature requests,
-- general feedback, and NPS survey responses.

CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('bug', 'feature', 'nps', 'general')),
  -- Rating scale: 0-10. NPS uses the full 0-10 scale; the in-app widget uses 1-5.
  rating INTEGER CHECK (rating IS NULL OR (rating >= 0 AND rating <= 10)),
  title TEXT,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'reviewed', 'planned', 'in_progress', 'completed', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Users can submit feedback (own rows, or anonymous rows with user_id NULL)
CREATE POLICY "Users insert feedback" ON feedback
  FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Users can read their own feedback
CREATE POLICY "Users read own feedback" ON feedback
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admins & moderators can read all feedback
CREATE POLICY "Admins read all feedback" ON feedback
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator')
  ));

-- Admins & moderators can update feedback (status changes, etc.)
CREATE POLICY "Admins update feedback" ON feedback
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator')
  ));

-- Common query pattern: filter by type/status, newest first
CREATE INDEX IF NOT EXISTS feedback_type_status_created_idx
  ON feedback (type, status, created_at DESC);
