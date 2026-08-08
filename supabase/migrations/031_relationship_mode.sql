-- Relationship intent for pairings and assessment sessions.
ALTER TABLE pairings ADD COLUMN relationship_type TEXT NOT NULL DEFAULT 'romantic' CHECK (relationship_type IN ('romantic','platonic'));
ALTER TABLE assessment_sessions ADD COLUMN mode TEXT NOT NULL DEFAULT 'romantic' CHECK (mode IN ('romantic','platonic'));
