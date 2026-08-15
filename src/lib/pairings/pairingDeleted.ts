// ──────────────────────────────────────────────────────────────
// SolidGround AI — partner-deleted detection (Sprint 8 live-test fix)
// ──────────────────────────────────────────────────────────────
// Live-test finding (2026-08-14): after an account is deleted via the
// mobile Delete Account flow (POST /api/account/delete → admin.auth.admin
// .deleteUser), the surviving partner still saw the deleted account as an
// active alignment match.
//
// Cause chain (all verified in the migrations):
//   1. profiles.id REFERENCES auth.users(id) ON DELETE CASCADE (migration
//      002) — deleting the auth user removes the profile.
//   2. pairings.inviter_user_id REFERENCES profiles(id) ON DELETE CASCADE;
//      pairings.invitee_user_id REFERENCES profiles(id) ON DELETE SET NULL
//      (migration 008). A deleted user who was the INVITER removes the
//      pairing; a deleted user who was the INVITEE leaves the pairing row
//      behind with invitee_user_id = NULL.
//   3. comparison_reports.pairing_id REFERENCES pairings(id) ON DELETE
//      CASCADE (migration 010) — the report survives with the pairing.
//
// So a non-pending pairing with invitee_user_id = NULL means the other
// participant deleted their account. The UI must never present that leftover
// row as an active Alignment Match™ (the report embeds the deleted user's
// data) — it shows the truthful "connection no longer active" state instead.
// A PENDING pairing legitimately has invitee_user_id = NULL until accept,
// so pending is never "partner deleted".
//
// Pure, dependency-free so both server component pages can share it and it
// stays trivially testable.
export interface PartnerDeletedCheck {
  status: string;
  invitee_user_id: string | null;
}

export function isPartnerDeletedPairing(p: PartnerDeletedCheck): boolean {
  return p.status !== "pending" && p.invitee_user_id === null;
}
