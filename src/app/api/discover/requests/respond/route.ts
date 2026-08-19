// ──────────────────────────────────────────────────────────────
// SolidGround AI — Mobile Discover Respond Request API (ADD for mobile client)
// ──────────────────────────────────────────────────────────────
// MOBILE-CLIENT ADD (owner-approved, Sprint 10 / S10-b): a bearer-token
// endpoint for the React Native app to accept or decline a connection
// request. NEW route only — no existing web-app behavior, file,
// migration, or RLS policy is touched.
//
// WHY SERVER-SIDE: web respondToConnectionRequest
// (src/lib/connections/actions.ts) is a server action. On ACCEPT it inserts
// a pairings row where the accepter is invitee_user_id — the pairings
// INSERT policy requires auth.uid() = inviter_user_id, so the receiver's
// client insert is rejected by RLS. It also reads BOTH users' latest
// Blueprint results (service), computes alignment, upserts the comparison
// report, and notifies via the service-only RPC. A native client cannot do
// this; this route reproduces it for the mobile bearer-token caller with
// all authorization at the service layer.
//
// ORDERING FIX (web gap, recon §6 risk 4): web flips status to 'accepted'
// BEFORE validating both users have Blueprint results, leaving the request
// 'accepted' with no pairing if validation fails. This route validates
// EVERYTHING (ownership, block, both users' results) BEFORE changing the
// request status, so a failed accept leaves the request safely pending.
//
// MOBILE CONSUMER CONTRACT:
//   POST /api/discover/requests/respond
//   Authorization: Bearer <supabase access token>
//   Body: { "requestId": "uuid", "accept": boolean }
//   200 { "success": true }                    (decline, or accept without pairing)
//   200 { "success": true, "pairingId": "uuid" }  (accept — pairing created)
//   400 { "error": "..." }  not found / already handled / blocked /
//                           missing blueprint / bad body
//   401 { "error": "..." }  missing or invalid token
//   500 { "error": "..." }  server failure (never a raw DB error)
//
// Side effects (identical to respondToConnectionRequest): decline → status
// update only; accept → status 'accepted' + completed pairings row +
// comparison_reports upsert + in-app "connection_accepted" notification to
// the requester (honoring in-app prefs).
// ──────────────────────────────────────────────────────────────
import { createServiceClient } from "@/lib/supabase/server";
import {
  authenticateRequest,
  getSessionResults,
  json,
  optionsResponse,
  resolveLatestCompletedSession,
  saveComparisonReport,
} from "@/lib/pairings/mobile-api";
import { usersAreBlocked } from "@/lib/pairings/blocked";
import { computeAlignment } from "@/lib/pairings/alignment";
import type { BlueprintResults } from "@/lib/scoring/types";

export const runtime = "nodejs";

/** CORS preflight. */
export async function OPTIONS() {
  return optionsResponse();
}

/**
 * Resolve a user's most recent completed Blueprint results via the
 * service client. Reuses the exported mobile-api helpers
 * (resolveLatestCompletedSession + getSessionResults) — the same steps
 * web's latestResults helper in connections/actions.ts performs; that
 * helper is module-private (not exported), so we compose the shared
 * primitives here rather than duplicating raw queries.
 */
async function latestResults(
  service: Awaited<ReturnType<typeof createServiceClient>>,
  userId: string,
): Promise<BlueprintResults | null> {
  const sessionId = await resolveLatestCompletedSession(service, userId, null);
  if (!sessionId) return null;
  return getSessionResults(service, sessionId, userId);
}

/**
 * Emit an in-app notification to another user. Mirrors the established
 * mobile-api notification pattern (notifyInviteAccepted): honor in-app
 * preferences, then send via the SECURITY DEFINER RPC
 * create_notification_for_user on the service client. Non-fatal on error.
 */
async function sendNotification(
  service: Awaited<ReturnType<typeof createServiceClient>>,
  targetUserId: string,
  type: string,
  title: string,
  message: string,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    const { data: prefs } = await service
      .from("profiles")
      .select("notification_preferences")
      .eq("id", targetUserId)
      .maybeSingle();
    const inApp = (
      prefs?.notification_preferences as
        | { in_app?: Record<string, boolean> }
        | null
        | undefined
    )?.in_app;
    if (inApp && inApp[type] === false) return;
    await service.rpc("create_notification_for_user", {
      target_user_id: targetUserId,
      notification_type: type,
      notification_title: title,
      notification_message: message,
      notification_data: data,
    });
  } catch (err) {
    console.error("[api/discover] Notification error:", err);
  }
}

/**
 * POST /api/discover/requests/respond — accept or decline a connection
 * request (the caller must be the receiver / to_user_id).
 */
export async function POST(request: Request) {
  // 1. Bearer-token authentication.
  const auth = await authenticateRequest(request);
  if (!auth.ok) return auth.response;
  const { userId } = auth;

  // 2. Parse the request body.
  let requestId: unknown;
  let accept: unknown;
  try {
    const body = (await request.json()) as {
      requestId?: unknown;
      accept?: unknown;
    };
    requestId = body?.requestId;
    accept = body?.accept;
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }
  if (typeof requestId !== "string" || requestId.trim().length === 0) {
    return json({ error: "requestId is required." }, 400);
  }
  const id = requestId.trim();
  if (typeof accept !== "boolean") {
    return json({ error: "accept must be a boolean." }, 400);
  }

  // 3. Read the request via the service client; ownership enforced by
  //    requiring to_user_id = the authenticated user.
  const service = await createServiceClient();
  const { data: req } = await service
    .from("connection_requests")
    .select("id,from_user_id,to_user_id,status,relationship_type")
    .eq("id", id)
    .eq("to_user_id", userId)
    .single();
  if (!req || req.status !== "pending") {
    return json({ error: "Request not found or already handled." }, 400);
  }

  // 4. Blocked-user enforcement (EITHER direction). Fail closed; generic
  //    copy so the caller can't learn a block exists.
  let isBlocked: boolean;
  try {
    isBlocked = await usersAreBlocked(service, userId, req.from_user_id);
  } catch (err) {
    console.error("[api/discover/respond] Block check error:", err);
    return json({ error: "This request is no longer available." }, 500);
  }
  if (isBlocked) {
    return json({ error: "This request is no longer available." }, 400);
  }

  // 5. For an ACCEPT, validate that BOTH users have latest completed
  //    Blueprint results BEFORE changing the request status (ordering fix —
  //    web flips status first and can leave a dangling 'accepted' request).
  let fromResults: BlueprintResults | null = null;
  let toResults: BlueprintResults | null = null;
  if (accept) {
    const [fr, tr] = await Promise.all([
      latestResults(service, req.from_user_id),
      latestResults(service, req.to_user_id),
    ]);
    fromResults = fr;
    toResults = tr;
    if (!fromResults || !toResults) {
      return json(
        { error: "Both users must have completed their Blueprint." },
        400,
      );
    }
  }

  // 6. Set the status. Decline is complete here — no notification.
  const { error: updateError } = await service
    .from("connection_requests")
    .update({ status: accept ? "accepted" : "declined" })
    .eq("id", id);
  if (updateError) {
    console.error("[api/discover/respond] Status update error:", updateError.message);
    return json({ error: "Could not update request." }, 500);
  }
  if (!accept) return json({ success: true }, 200);

  // 7. ACCEPT path — create the completed pairing (mirrors the web action:
  //    inviter = requester (from), invitee = accepter (to), status completed).
  const relationshipType = req.relationship_type === "platonic" ? "platonic" : "romantic";
  const alignmentResults = computeAlignment(fromResults!, toResults!);
  const { data: pairing, error: pairingError } = await service
    .from("pairings")
    .insert({
      invite_code: crypto.randomUUID().slice(0, 8),
      inviter_user_id: req.from_user_id,
      inviter_session_id: fromResults!.sessionId,
      invitee_user_id: req.to_user_id,
      invitee_session_id: toResults!.sessionId,
      status: "completed",
      relationship_type: relationshipType,
      alignment_results: alignmentResults,
    })
    .select("id")
    .single();
  if (pairingError || !pairing) {
    console.error("[api/discover/respond] Pairing insert error:", pairingError?.message);
    return json({ error: "Failed to create pairing." }, 500);
  }

  // 8. Generate + upsert the comparison report (best-effort — a report
  //    failure must not undo the accept; saveComparisonReport handles this).
  await saveComparisonReport(pairing.id, fromResults!, toResults!);

  // 9. Notify the requester (best-effort).
  await sendNotification(
    service,
    req.from_user_id,
    "connection_accepted",
    "Connection accepted",
    "Your connection request was accepted. Your Alignment Match is ready.",
    { pairing_id: pairing.id, href: `/dashboard/pairings/${pairing.id}` },
  );

  return json({ success: true, pairingId: pairing.id }, 200);
}
