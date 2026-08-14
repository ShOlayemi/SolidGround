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

/**
 * True when a block exists between two users, in EITHER direction.
 * Variant of pairingIsBlocked for paths that have no pairing yet (e.g.
 * the Discover connection-request flow). Queries blocked_users directly
 * for the (A→B) OR (B→A) pair with the service client, which bypasses
 * RLS — a user client could not do this inline because blocked_users
 * RLS only exposes the caller's OWN blocks, hiding "the other user
 * blocked me". Returns only a boolean; no user data is read into the
 * app. Throws on query error so callers fail closed.
 */
export async function usersAreBlocked(
  serviceClient: SupabaseClient,
  userIdA: string,
  userIdB: string,
): Promise<boolean> {
  const { count, error } = await serviceClient
    .from("blocked_users")
    .select("blocker_user_id", { count: "exact", head: true })
    .or(
      `and(blocker_user_id.eq.${userIdA},blocked_user_id.eq.${userIdB}),and(blocker_user_id.eq.${userIdB},blocked_user_id.eq.${userIdA})`,
    );
  if (error) {
    throw new Error(`blocked_users check failed: ${error.message}`);
  }
  return (count ?? 0) > 0;
}
