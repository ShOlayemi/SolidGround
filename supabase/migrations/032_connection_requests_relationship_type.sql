-- Add relationship_type to connection requests so Discover connections carry relationship intent.
ALTER TABLE connection_requests ADD COLUMN IF NOT EXISTS relationship_type TEXT NOT NULL DEFAULT 'romantic' CHECK (relationship_type IN ('romantic','platonic'));
