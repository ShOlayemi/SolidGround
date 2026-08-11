// ──────────────────────────────────────────────────────────────
// SolidGround AI — Mobile Pairing Disconnect API (ADD for mobile client)
// ──────────────────────────────────────────────────────────────
// MOBILE-CLIENT ADD (owner-approved, Sprint 6 / S6-1): a bearer-token
// endpoint for the React Native app to disconnect a completed pairing.
// NEW route only — no existing web-app behavior, file, migration, or RLS
// policy is touched.
//
// WHY SERVER-SIDE: pairings has NO DELETE policy at all (migration 008
// deliberately grants SELECT/INSERT/UPDATE only), so a client-side delete
// is blocked by RLS. This route deletes with the service client after
// verifying the caller is a participant. Deleting the pairing CASCADES to
// pairing_messages, comparison_reports, and pairing_invitations (all
// reference pairings(id) ON DELETE CASCADE). Blueprint/assessment data is
// NEVER touched — each partner keeps their own Compatibility Blueprint.
//
// MOBILE CONSUMER CONTRACT:
//   POST /api/pairings/disconnect
//   Authorization: Bearer <supabase access token>
//   Body: { "pairingId": "uuid" }
//   200 { "success": true }
//   400 { "error": "..." }  bad body
//   401 { "error": "..." }  missing or invalid token
//   403 { "error": "..." }  authenticated but not a participant
//   404 { "error": "..." }  pairing not found
//   500 { "error": "..." }  server failure (never a raw DB error)
// ──────────────────────────────────────────────────────────────
import { createServiceClient } from "@/lib/supabase/server";
import {
  authenticateRequest,
  auditLog,
  json,
  optionsResponse,
} from "@/lib/pairings/mobile-api";

export const runtime = "nodejs";

/** CORS preflight. */
export async function OPTIONS() {
  return optionsResponse();
}

/**
 * POST /api/pairings/disconnect — delete a pairing the caller belongs to.
 */
export async function POST(request: Request) {
  // 1. Bearer-token authentication.
  const auth = await authenticateRequest(request);
  if (!auth.ok) return auth.response;
  const { userId } = auth;

  // 2. Parse the request body.
  let rawPairingId: unknown;
  try {
    const body = (await request.json()) as { pairingId?: unknown };
    rawPairingId = body?.pairingId;
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }
  if (typeof rawPairingId !== "string" || rawPairingId.trim().length === 0) {
    return json({ error: "pairingId is required." }, 400);
  }
  const pairingId = rawPairingId.trim();

  // 3. Read the pairing and verify the caller is a participant (service
  //    client: pairings has no DELETE policy, so the existence check must
  //    not be subject to RLS).
  const service = await createServiceClient();
  const { data: pairing, error: readError } = await service
    .from("pairings")
    .select("id, inviter_user_id, invitee_user_id")
    .eq("id", pairingId)
    .single();
  if (readError || !pairing) {
    return json({ error: "Pairing not found." }, 404);
  }
  if (
    pairing.inviter_user_id !== userId &&
    pairing.invitee_user_id !== userId
  ) {
    return json({ error: "You are not a partner in this pairing." }, 403);
  }

  // 4. Delete the pairing (service client — no DELETE policy exists for
  //    client-side calls). ON DELETE CASCADE removes messages, comparison
  //    reports, and invitation lifecycle rows. Blueprint/assessment data
  //    is never deleted.
  const { error: deleteError } = await service
    .from("pairings")
    .delete()
    .eq("id", pairingId);
  if (deleteError) {
    console.error("[api/pairings/disconnect] Pairing delete error:", deleteError.message);
    return json({ error: "Failed to disconnect." }, 500);
  }

  // 5. Audit (non-fatal).
  await auditLog(userId, "pairing.disconnect", "pairings", pairingId, {});

  return json({ success: true }, 200);
}
