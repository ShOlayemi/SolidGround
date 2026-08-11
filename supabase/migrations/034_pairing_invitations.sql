-- ============================================================
-- MIGRATION 034: Pairing Invitations
-- ============================================================
-- Invitation lifecycle for two-person compatibility (Sprint 6 / S6-1) —
-- shared by the web app and the mobile app (one account, one dataset).
--
-- Additive only: creates ONE new table. No existing table is altered, no
-- data is deleted, and no RLS policy on an existing table is changed.
-- Blueprint tables/scoring are untouched. The pairings table is NOT
-- modified: it keeps its existing UPDATE policy (inviter-or-invitee) and
-- deliberately NO DELETE policy — accept and disconnect run server-side
-- through the mobile-facing API routes using the service client, because
-- RLS cannot express either operation:
--   • accept: pairings.invitee_user_id is NULL until accept, so the
--     UPDATE policy (auth.uid() = inviter OR invitee) excludes the
--     recipient; the anon-key "pending pairing by code" SELECT policy
--     would also leak every pairing column to anyone holding the code,
--     so the mobile client never reads pairings by code directly.
--   • disconnect: pairings has no DELETE policy at all.
--
-- Lifecycle: created (pending) → accepted | declined | cancelled | expired.
-- The row dies with its pairing via ON DELETE CASCADE (a disconnect deletes
-- the pairing, which removes its invitation row too); there is deliberately
-- NO DELETE policy on this table.
--
-- invite_token reuses the pairings.invite_code value (the same 8-char share
-- token) so a single code resolves both the pairing and its lifecycle row
-- (UNIQUE on invite_token mirrors UNIQUE on pairings.invite_code).
-- expires_at defaults to 7 days; the accept route rejects expired invites.
-- invitee_email is nullable for parity with the web app's email-invite flow.
--
-- updated_at maintenance: repo convention (see migrations 005/008/033) —
-- a BEFORE UPDATE trigger using the existing update_updated_at_column()
-- function. Writers only UPDATE rows; the database stamps updated_at.
-- ============================================================
CREATE TABLE IF NOT EXISTS pairing_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pairing_id UUID NOT NULL REFERENCES pairings(id) ON DELETE CASCADE,
  inviter_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invite_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
  invitee_email TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- (invite_token) index is implicit via UNIQUE. Keep the pairing and
-- expiry lookups cheap: invitations are always addressed by pairing or
-- by status+expiry (e.g. "expire stale pending invites").
CREATE INDEX IF NOT EXISTS idx_pairing_invitations_inviter
  ON pairing_invitations(inviter_user_id);
CREATE INDEX IF NOT EXISTS idx_pairing_invitations_status_expires
  ON pairing_invitations(status, expires_at);
-- Updated-at trigger (repo convention; function from migration 005).
CREATE TRIGGER set_pairing_invitations_updated_at
  BEFORE UPDATE ON pairing_invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- RLS: the inviter, or either participant of the underlying pairing, may
-- read/update the lifecycle row (consistent with the pairings policies).
-- The pairing join is the source of truth for "who may see this" —
-- the invitee only exists in pairings AFTER accept, so a pending
-- invitation's recipient cannot (and need not) touch the row via RLS:
-- accept is performed server-side by the mobile API route with the
-- service client (see header for why). The status CHECK keeps writes
-- to the intended lifecycle transitions.
ALTER TABLE pairing_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own pairing invitations" ON pairing_invitations
  FOR SELECT TO authenticated
  USING (
    auth.uid() = inviter_user_id
    OR EXISTS (
      SELECT 1 FROM pairings p
      WHERE p.id = pairing_invitations.pairing_id
      AND (p.inviter_user_id = auth.uid() OR p.invitee_user_id = auth.uid())
    )
  );
CREATE POLICY "Users create pairing invitations" ON pairing_invitations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = inviter_user_id);
CREATE POLICY "Users update pairing invitations" ON pairing_invitations
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = inviter_user_id
    OR EXISTS (
      SELECT 1 FROM pairings p
      WHERE p.id = pairing_invitations.pairing_id
      AND (p.inviter_user_id = auth.uid() OR p.invitee_user_id = auth.uid())
    )
  );
