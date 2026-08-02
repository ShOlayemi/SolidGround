-- GDPR consent preferences. JSON stores purpose, status, and timestamp per category.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gdpr_consent JSONB NOT NULL DEFAULT '{}'::jsonb;
