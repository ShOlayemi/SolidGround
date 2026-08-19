// ──────────────────────────────────────────────────────────────
// SolidGround AI — Mobile Discover Send Request API (ADD for mobile client)
// ──────────────────────────────────────────────────────────────
// MOBILE-CLIENT ADD (owner-approved, Sprint 10 / S10-b): a bearer-token
// endpoint for the React Native app to send a connection request in
// Discover. NEW route only — no existing web-app behavior, file,
// migration, or RLS policy is touched.
//
// WHY SERVER-SIDE: web sendConnectionRequest (src/lib/connections/actions.ts)
// is a server action that enforces block + duplicate checks on the service
// client. A native client cannot invoke server actions, and a raw client
// RLS INSERT would skip both the block check (blocked_users RLS is
// own-row-only, so a client can't see "the other user blocked me") and the
// duplicate pre-check. This route reproduces the action for the mobile
// bearer-token caller with all authorization at the service layer.
//
// MOBILE CONSUMER CONTRACT:
//   POST /api/discover/requests
//   Authorization: Bearer <supabase access token>
//   Body: { "toUserId": "uuid", "relationshipType"?: "romantic" | "platonic" }
//   200 { "success": true }
//   400 { "error": "..." }  self-connect / already pending / unavailable /
//                           bad relationshipType
//   401 { "error": "..." }  missing or invalid token
//   500 { "error": "..." }  server failure (never a raw DB error)
//
// Side effects (identical to sendConnectionRequest): insert a pending
// connection_requests row, then an in-app notification to the TARGET
// (type "connection_request") via create_notification_for_user RPC,
// honoring the target's in-app notification preferences.
// ──────────────────────────────────────────────────────────────
import { createServiceClient } from "@/lib/supabase/server";
import {
  authenticateRequest,
  json,
  optionsResponse,
} from "@/lib/pairings/mobile-api";
import { usersAreBlocked } from "@/lib/pairings/blocked";

export const runtime = "nodejs";

/** CORS preflight. */
export async function OPTIONS() {
  return optionsResponse();
}

/**
 * Emit an in-app notification to another user. Mirrors the established
 * mobile-api notification pattern (notifyInviteAccepted): honor in-app
 * preferences, then send via the SECURITY DEFINER RPC
 * create_notification_for_user on the service client (service-role only
 * since migration 036). Non-fatal on error.
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
 * POST /api/discover/requests — send a connection request to another user.
 */
export async function POST(request: Request) {
  // 1. Bearer-token authentication.
  const auth = await authenticateRequest(request);
  if (!auth.ok) return auth.response;
  const { userId } = auth;

  // 2. Parse the request body.
  let toUserId: unknown;
  let relationshipType: unknown;
  try {
    const body = (await request.json()) as {
      toUserId?: unknown;
      relationshipType?: unknown;
    };
    toUserId = body?.toUserId;
    relationshipType = body?.relationshipType;
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }
  if (typeof toUserId !== "string" || toUserId.trim().length === 0) {
    return json({ error: "toUserId is required." }, 400);
  }
  const target = toUserId.trim();
  if (
    relationshipType !== undefined &&
    relationshipType !== "romantic" &&
    relationshipType !== "platonic"
  ) {
    return json(
      { error: "relationshipType must be 'romantic' or 'platonic'." },
      400,
    );
  }
  const relType = relationshipType === "platonic" ? "platonic" : "romantic";

  // 3. Self-check.
  if (target === userId) {
    return json({ error: "You cannot connect with yourself." }, 400);
  }

  // 4. Blocked-user enforcement (EITHER direction). The service client
  //    bypasses RLS, so the route enforces blocking itself. Fail closed;
  //    respond with generic copy so the caller can't learn a block exists.
  const service = await createServiceClient();
  let isBlocked: boolean;
  try {
    isBlocked = await usersAreBlocked(service, userId, target);
  } catch (err) {
    console.error("[api/discover/requests] Block check error:", err);
    return json({ error: "Could not send request." }, 500);
  }
  if (isBlocked) {
    return json({ error: "This user is no longer available." }, 400);
  }

  // 5. Duplicate pre-check (any pending row in EITHER direction).
  const { data: existing } = await service
    .from("connection_requests")
    .select("id,status")
    .or(
      `and(from_user_id.eq.${userId},to_user_id.eq.${target}),and(from_user_id.eq.${target},to_user_id.eq.${userId})`,
    )
    .eq("status", "pending")
    .maybeSingle();
  if (existing) {
    return json({ error: "A request is already pending." }, 400);
  }

  // 6. Insert the pending request (service client).
  const { error } = await service.from("connection_requests").insert({
    from_user_id: userId,
    to_user_id: target,
    relationship_type: relType,
  });
  if (error) {
    console.error("[api/discover/requests] Insert error:", error.message);
    return json({ error: "Could not send request." }, 500);
  }

  // 7. Notification to the target (best-effort, non-fatal).
  const { data: profile } = await service
    .from("profiles")
    .select("display_name,full_name")
    .eq("id", userId)
    .maybeSingle();
  const name = profile?.display_name ?? profile?.full_name ?? "Someone";
  await sendNotification(
    service,
    target,
    "connection_request",
    "New connection request",
    `${name} would like to connect with you.`,
    { from_user_id: userId, href: "/dashboard/requests" },
  );

  return json({ success: true }, 200);
}
