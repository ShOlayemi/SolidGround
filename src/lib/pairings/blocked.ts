// ──────────────────────────────────────────────────────────────
// SolidGround AI — Blocked-user enforcement helper (Sprint 8 §7)
// ──────────────────────────────────────────────────────────────
// The pairing API routes use the SERVICE client, which bypasses RLS.
// Migration 036 narrowed the pairings / pairing_invitations policies
// so blocked participants lose visibility for client-side reads, but
// the service client is immune to those policies — so the routes must
// enforce blocking themselves.
//
// This helper delegates to the SECURITY DEFINER function
// pairing_is_blocked (migration 036), which returns true when a block
// exists between the two participants of the given pairing, in EITHER
// direction. The function runs as the table owner precisely because
// blocked_users RLS hides "the other user blocked me" from inline
// reads; it returns only a boolean, so no user data leaks.
//
// FAIL-CLOSED: on RPC error this THROWS so the caller's normal 500
// path runs. A helper failure must never silently turn into
// "not blocked" and let a blocked participant act on the pairing.
// ──────────────────────────────────────────────────────────────
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * True when a block exists between the two participants of the given
 * pairing, in either direction. Delegates to the SECURITY DEFINER
 * helper pairing_is_blocked (migration 036). Throws on RPC error so
 * callers fail closed through their normal 500 path.
 */
export async function pairingIsBlocked(
  serviceClient: SupabaseClient,
  pairingId: string,
): Promise<boolean> {
  const { data, error } = await serviceClient.rpc("pairing_is_blocked", {
    target_pairing_id: pairingId,
  });
  if (error) {
    throw new Error(`pairing_is_blocked RPC failed: ${error.message}`);
  }
  return data === true;
}
