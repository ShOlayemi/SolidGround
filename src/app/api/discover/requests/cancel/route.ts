// ──────────────────────────────────────────────────────────────
// SolidGround AI — Mobile Discover Cancel Request API (ADD for mobile client)
// ──────────────────────────────────────────────────────────────
// MOBILE-CLIENT ADD (owner-approved, Sprint 10 / S10-b): a bearer-token
// endpoint for the React Native app to cancel (delete) a connection
// request the caller previously SENT. NEW route only — no existing web-app
// behavior, file, migration, or RLS policy is touched.
//
// WHY SERVER-SIDE: web cancelConnectionRequest
// (src/lib/connections/actions.ts) uses a client RLS DELETE scoped to the
// sender. A native client could express the same, but this route keeps the
// cancel path consistent with the rest of the mobile Discover surface
// (server-side, service client) and returns a reliable not-found signal.
//
// MOBILE CONSUMER CONTRACT:
//   POST /api/discover/requests/cancel
//   Authorization: Bearer <supabase access token>
//   Body: { "requestId": "uuid" }
//   200 { "success": true }
//   404 { "error": "..." }  request not found (not yours / already gone)
//   400 { "error": "..." }  bad body
//   401 { "error": "..." }  missing or invalid token
//   500 { "error": "..." }  server failure (never a raw DB error)
// ──────────────────────────────────────────────────────────────
import { createServiceClient } from "@/lib/supabase/server";
import {
  authenticateRequest,
  json,
  optionsResponse,
} from "@/lib/pairings/mobile-api";

export const runtime = "nodejs";

/** CORS preflight. */
export async function OPTIONS() {
  return optionsResponse();
}

/**
 * POST /api/discover/requests/cancel — delete the caller's own pending
 * connection request (sender-only; scoped by from_user_id).
 */
export async function POST(request: Request) {
  // 1. Bearer-token authentication.
  const auth = await authenticateRequest(request);
  if (!auth.ok) return auth.response;
  const { userId } = auth;

  // 2. Parse the request body.
  let requestId: unknown;
  try {
    const body = (await request.json()) as { requestId?: unknown };
    requestId = body?.requestId;
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }
  if (typeof requestId !== "string" || requestId.trim().length === 0) {
    return json({ error: "requestId is required." }, 400);
  }
  const id = requestId.trim();

  // 3. Delete the sender's own row via the service client. The count
  //    distinguishes "not found / not yours" from a real delete.
  const service = await createServiceClient();
  const { error, count } = await service
    .from("connection_requests")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("from_user_id", userId);
  if (error) {
    console.error("[api/discover/cancel] Delete error:", error.message);
    return json({ error: "Could not cancel request." }, 500);
  }
  if (!count) {
    return json({ error: "Request not found." }, 404);
  }

  return json({ success: true }, 200);
}
