-- ============================================================
-- MIGRATION 036: Trust & Safety — shared_agreements, blocked_users,
-- reports + RLS security fixes (F2, F3, blocked enforcement)
-- ============================================================
-- Sprint 8 "Safety, Trust, Privacy & Relationship Decision Support"
-- (owner brief 2026-08-12; audit S8_AUDIT.md §C) — shared by the web
-- app and the mobile app (one account, one dataset).
--
-- What this block does, in plain language:
--   1. shared_agreements — a NEW table for agreed relationship
--      decisions, modeled exactly on shared_goals (migration 035):
--      both participants of a pairing can read/create/update/delete
--      rows; created_by must be the signed-in user.
--   2. blocked_users — lets a user block another user. Blocking is
--      ENFORCED BY THE DATABASE, not just the UI (owner brief §7):
--      once a block exists in EITHER direction, the two users can no
--      longer see or update the shared pairing or its invitation, and
--      every table that grants access "via the pairing" (comparison
--      reports, relationship topics, shared goals, shared agreements,
--      pairing messages) automatically hides that pairing's rows.
--   3. reports — user-generated abuse/safety reports. Only the
--      reporter can read or insert their own reports; there are NO
--      UPDATE/DELETE policies for signed-in users, so status changes
--      (open -> reviewed/actioned/dismissed) are service-role only.
--      No public feed.
--   4. F2 (audit §C HIGH): the create_notification_for_user RPC
--      (SECURITY DEFINER, migration 020) was executable by ANY
--      signed-in user to write a notification for ANY target user.
--      EXECUTE is now revoked from authenticated/anon and granted to
--      service_role only (the web's server-side callers use the
--      service client, so they keep working).
--   5. F3 (audit §C HIGH): the comparison_reports INSERT policy was
--      WITH CHECK (true) — any signed-in user could insert a report
--      row for any pairing. The insert now requires the caller to be
--      a participant of the pairing (mirror of the SELECT policy).
--      The web's refresh/accept route writes via the service client
--      and the mobile app never inserts comparison_reports, so
--      tightening is safe.
--   6. Blocked-relationship enforcement (owner brief §7): the
--      pairings and pairing_invitations SELECT/UPDATE policies now
--      also exclude pairings that have a block between the two
--      participants. The migration-025 anon policy "Anyone can read
--      pending pairing by code" is deliberately NOT changed (audit
--      F1 is disclose-only this sprint — a future owner-ratified web
--      change may narrow it).
--
-- The block check uses a SECURITY DEFINER helper function
-- (pairing_is_blocked) rather than an inline EXISTS on blocked_users,
-- because blocked_users RLS only lets a user read their OWN blocking
-- rows — an inline subquery could therefore never see the "the other
-- user blocked me" direction. SECURITY DEFINER (same pattern as
-- get_profile_display_name in migration 025) lets the policy see all
-- blocked_users rows. It returns ONLY a boolean — no user data leaks.
--
-- Additive overall, with three deliberate exceptions (all authorized
-- by the owner brief / audit): the two RLS policy fixes (F2, F3) and
-- the narrowed pairings/invitations policies (blocked enforcement).
-- No table is dropped, no data is deleted, Blueprint tables/scoring
-- are untouched.
--
-- FULLY RE-RUNNABLE (2026-08-13): every CREATE POLICY is preceded by
-- DROP POLICY IF EXISTS and the trigger by DROP TRIGGER IF EXISTS, so
-- re-applying after a partial or already-complete run is safe.
-- ============================================================

-- ============================================================
-- 1) shared_agreements (Sprint 8 candidate B — owner picked the
--    own-table option; modeled 1:1 on shared_goals, migration 035)
-- ============================================================
CREATE TABLE IF NOT EXISTS shared_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pairing_id UUID NOT NULL REFERENCES pairings(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  domain TEXT,                                  -- one of the 12 category ids or NULL
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','agreed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shared_agreements_pairing_status
  ON shared_agreements(pairing_id, status);
-- Updated-at trigger (repo convention; function from migration 005).
-- DROP-guarded so the whole script is re-runnable (owner hit 42710 on a
-- second run — the trigger already existed).
DROP TRIGGER IF EXISTS set_shared_agreements_updated_at ON shared_agreements;
CREATE TRIGGER set_shared_agreements_updated_at BEFORE UPDATE ON shared_agreements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
ALTER TABLE shared_agreements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Partners read their shared agreements" ON shared_agreements;
CREATE POLICY "Partners read their shared agreements" ON shared_agreements FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM pairings p WHERE p.id = shared_agreements.pairing_id
    AND (p.inviter_user_id = auth.uid() OR p.invitee_user_id = auth.uid())));
DROP POLICY IF EXISTS "Partners create shared agreements" ON shared_agreements;
CREATE POLICY "Partners create shared agreements" ON shared_agreements FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND EXISTS (SELECT 1 FROM pairings p WHERE p.id = shared_agreements.pairing_id
    AND (p.inviter_user_id = auth.uid() OR p.invitee_user_id = auth.uid())));
DROP POLICY IF EXISTS "Partners update shared agreements" ON shared_agreements;
CREATE POLICY "Partners update shared agreements" ON shared_agreements FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM pairings p WHERE p.id = shared_agreements.pairing_id
    AND (p.inviter_user_id = auth.uid() OR p.invitee_user_id = auth.uid())));
DROP POLICY IF EXISTS "Partners delete shared agreements" ON shared_agreements;
CREATE POLICY "Partners delete shared agreements" ON shared_agreements FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM pairings p WHERE p.id = shared_agreements.pairing_id
    AND (p.inviter_user_id = auth.uid() OR p.invitee_user_id = auth.uid())));
-- DELETE policy mirrors shared_goals: both partners may remove a row (UI provides delete).

-- ============================================================
-- 2) blocked_users (owner brief §7 — blocking, DB-enforced)
-- ============================================================
CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (blocker_user_id, blocked_user_id),
  CHECK (blocker_user_id <> blocked_user_id)   -- cannot block yourself
);
-- The UNIQUE constraint already indexes (blocker_user_id, blocked_user_id);
-- this second index covers the "who blocked me" direction used by the
-- DB-enforcement helper below.
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked
  ON blocked_users(blocked_user_id);
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own blocks" ON blocked_users;
CREATE POLICY "Users read own blocks" ON blocked_users FOR SELECT TO authenticated USING (blocker_user_id = auth.uid());
DROP POLICY IF EXISTS "Users create own blocks" ON blocked_users;
CREATE POLICY "Users create own blocks" ON blocked_users FOR INSERT TO authenticated WITH CHECK (blocker_user_id = auth.uid());
DROP POLICY IF EXISTS "Users delete own blocks" ON blocked_users;
CREATE POLICY "Users delete own blocks" ON blocked_users FOR DELETE TO authenticated USING (blocker_user_id = auth.uid());
-- Only the blocker can manage their own block list; no UPDATE policy.

-- SECURITY DEFINER helper: true when a block exists between the two
-- participants of the given pairing, in EITHER direction. Runs as the
-- table owner so RLS on blocked_users does not hide the "other user
-- blocked me" direction. Returns a boolean only — no user data leaks.
CREATE OR REPLACE FUNCTION public.pairing_is_blocked(target_pairing_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pairings p
    JOIN public.blocked_users b
      ON (b.blocker_user_id = p.inviter_user_id AND b.blocked_user_id = p.invitee_user_id)
      OR (b.blocker_user_id = p.invitee_user_id AND b.blocked_user_id = p.inviter_user_id)
    WHERE p.id = target_pairing_id
  );
$$;
REVOKE ALL ON FUNCTION public.pairing_is_blocked(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pairing_is_blocked(uuid) TO authenticated;

-- ============================================================
-- 3) reports (owner brief §8 — abuse/safety reports, no public feed)
-- ============================================================
-- reported_user_id is nullable because some reports are about AI
-- output/content rather than a specific user. connection_id survives a
-- disconnect (ON DELETE SET NULL) so the report keeps its evidence
-- context. Status changes are service-role only (moderation queue).
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES pairings(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('harassment','inappropriate','unsafe','privacy','ai','other')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed','actioned','dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status); -- moderation queue (service role)
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own reports" ON reports;
CREATE POLICY "Users read own reports" ON reports FOR SELECT TO authenticated USING (reporter_user_id = auth.uid());
DROP POLICY IF EXISTS "Users create own reports" ON reports;
CREATE POLICY "Users create own reports" ON reports FOR INSERT TO authenticated WITH CHECK (reporter_user_id = auth.uid());
-- NO UPDATE/DELETE policies: status changes (open/reviewed/actioned/dismissed)
-- are service-role only, like admin_audit_log (017/023/026 pattern).

-- ============================================================
-- 4) F2 (audit §C HIGH): notifications RPC — server-side only
-- ============================================================
-- create_notification_for_user is SECURITY DEFINER (migration 020).
-- It was granted to authenticated, so ANY signed-in user could write
-- a notification row for ANY target user id. Client roles are revoked;
-- service_role keeps EXECUTE so the web's server-side callers (which
-- use the service client) keep working.
REVOKE EXECUTE ON FUNCTION public.create_notification_for_user(UUID, TEXT, TEXT, TEXT, JSONB) FROM authenticated, anon;
GRANT EXECUTE ON FUNCTION public.create_notification_for_user(UUID, TEXT, TEXT, TEXT, JSONB) TO service_role;

-- ============================================================
-- 5) F3 (audit §C HIGH): comparison_reports INSERT — participant only
-- ============================================================
-- The migration-010 policy ("Service inserts comparison reports") was
-- WITH CHECK (true): any signed-in user could insert a report row for
-- any pairing_id. Drop both historical names (010 and the migration-024
-- rename) if present, then recreate as a participant-checked insert
-- mirroring the SELECT policy expression verbatim.
DROP POLICY IF EXISTS "Service inserts comparison reports" ON comparison_reports;
DROP POLICY IF EXISTS "Partners can insert own report" ON comparison_reports;
DROP POLICY IF EXISTS "Partners can insert own report" ON comparison_reports;
CREATE POLICY "Partners can insert own report" ON comparison_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pairings p
      WHERE p.id = comparison_reports.pairing_id
      AND (p.inviter_user_id = auth.uid() OR p.invitee_user_id = auth.uid())
    )
  );

-- ============================================================
-- 6) Blocked-relationship enforcement (owner brief §7): pairings +
--    pairing_invitations SELECT/UPDATE exclude blocked pairings
-- ============================================================
-- pairings: participants may read/update EXCEPT when a block exists
-- between the two participants in either direction.
ALTER POLICY "Users read own pairings" ON pairings
  USING (
    (auth.uid() = inviter_user_id OR auth.uid() = invitee_user_id)
    AND NOT public.pairing_is_blocked(id)
  );
ALTER POLICY "Users update own pairings" ON pairings
  USING (
    (auth.uid() = inviter_user_id OR auth.uid() = invitee_user_id)
    AND NOT public.pairing_is_blocked(id)
  )
  WITH CHECK (
    (auth.uid() = inviter_user_id OR auth.uid() = invitee_user_id)
    AND NOT public.pairing_is_blocked(id)
  );
-- WITH CHECK mirrors USING so a client-side accept/update that would
-- connect two blocked users is also rejected on the NEW row.

-- pairing_invitations: inviter/participant may read/update EXCEPT when
-- the underlying pairing has a block between its participants.
ALTER POLICY "Users read own pairing invitations" ON pairing_invitations
  USING (
    (auth.uid() = inviter_user_id
     OR EXISTS (
       SELECT 1 FROM pairings p
       WHERE p.id = pairing_invitations.pairing_id
       AND (p.inviter_user_id = auth.uid() OR p.invitee_user_id = auth.uid())
     ))
    AND NOT public.pairing_is_blocked(pairing_id)
  );
ALTER POLICY "Users update pairing invitations" ON pairing_invitations
  USING (
    (auth.uid() = inviter_user_id
     OR EXISTS (
       SELECT 1 FROM pairings p
       WHERE p.id = pairing_invitations.pairing_id
       AND (p.inviter_user_id = auth.uid() OR p.invitee_user_id = auth.uid())
     ))
    AND NOT public.pairing_is_blocked(pairing_id)
  );

-- Downstream tables (comparison_reports, relationship_topics,
-- shared_goals, shared_agreements, pairing_messages) grant access via
-- EXISTS (SELECT 1 FROM pairings p WHERE p.id = ... AND participant).
-- Those subqueries read pairings under its RLS, so a blocked user's
-- subquery returns no rows and the downstream rows become invisible
-- automatically — no per-table policy changes needed.
-- The migration-025 anon policy "Anyone can read pending pairing by
-- code" is deliberately UNCHANGED (audit F1 is disclose-only this
-- sprint). Note: because that anon policy reads rows by status alone,
-- a PENDING pairing (invitee_user_id still NULL — no block can exist
-- yet) remains discoverable by code; the block check only matters
-- once both participants exist on the row (accepted/completed).
