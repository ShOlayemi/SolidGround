-- 037_discover_privacy.sql
-- Sprint 10 (S10-f): Discover privacy control (owner decision 2026-08-19, option b).
-- ADD-only + idempotent (safe to re-run, mirrors the 032/034 pattern).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS discoverable boolean NOT NULL DEFAULT true;
COMMENT ON COLUMN profiles.discoverable IS
  'S10-f: when false, the user is excluded from Discover browse (GET /api/discover/users). Default true = discoverable (opt-out).';