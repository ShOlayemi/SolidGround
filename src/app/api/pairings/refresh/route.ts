// ──────────────────────────────────────────────────────────────
// SolidGround AI — Mobile Pairing Refresh API (ADD for mobile client)
// ──────────────────────────────────────────────────────────────
// MOBILE-CLIENT ADD (owner-approved, Sprint 6 / S6-1): a bearer-token
// endpoint for the React Native app to regenerate a completed pairing's
// comparison report from each partner's LATEST completed assessment
// (so a retaken Blueprint is reflected). NEW route only — no existing
// web-app behavior, file, migration, or RLS policy is touched.
//
// Mirrors refreshReport() in src/lib/pairings/actions.ts: resolve both
// partners' most recent completed sessions (falling back to the pairing's
// pinned sessions), re-fetch blueprint_results via the SERVICE client
// (cross-user reads are blocked by RLS), regenerate + upsert
// comparison_reports, and refresh pairings.alignment_results.
//
// MOBILE CONSUMER CONTRACT:
//   POST /api/pairings/refresh
//   Authorization: Bearer <supabase access token>
//   Body: { "pairingId": "uuid" }
//   200 { "success": true, "pairingId": "uuid",
//         "report": <ComparisonReport> }   // full fresh report, no extra
//                                           // round-trip needed
//   400 { "error": "..." }  bad body / pairing not accepted yet
//   401 { "error": "..." }  missing or invalid token
//   403 { "error": "..." }  authenticated but not a participant
//   404 { "error": "..." }  pairing not found
//   500 { "error": "..." }  server failure (never a raw DB error)
// ──────────────────────────────────────────────────────────────
import { createServiceClient } from "@/lib/supabase/server";
import { computeAlignment } from "@/lib/pairings/alignment";
import {
  authenticateRequest,
  auditLog,
  getSessionResults,
  json,
  optionsResponse,
  resolveLatestCompletedSession,
  saveComparisonReport,
} from "@/lib/pairings/mobile-api";
import { pairingIsBlocked } from "@/lib/pairings/blocked";

export const runtime = "nodejs";

/** CORS preflight. */
export async function OPTIONS() {
  return optionsResponse();
}

type PairingRow = {
  id: string;
  inviter_user_id: string;
  invitee_user_id: string | null;
  inviter_session_id: string;
  invitee_session_id: string | null;
  status: string;
};

/**
 * POST /api/pairings/refresh — regenerate a pairing's comparison report
 * from both partners' latest completed assessments.
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
  //    client read — cross-user rows and the not-a-participant case must
  //    be distinguishable, and we need both partners' pinned sessions).
  const service = await createServiceClient();
  const { data: pairing, error: readError } = await service
    .from("pairings")
    .select("id, inviter_user_id, invitee_user_id, inviter_session_id, invitee_session_id, status")
    .eq("id", pairingId)
    .single();
  if (readError || !pairing) {
    return json({ error: "Pairing not found." }, 404);
  }
  const p = pairing as PairingRow;
  if (p.inviter_user_id !== userId && p.invitee_user_id !== userId) {
    return json({ error: "You are not a partner in this pairing." }, 403);
  }

  // 4. Blocked-user enforcement (Sprint 8 §7, migration 036). The
  //    service client bypasses RLS, so the route must enforce blocking
  //    itself. A block in EITHER direction makes the pairing invisible:
  //    respond with the same not-found copy as a missing pairing so the
  //    caller can never learn a block exists. Fail closed on RPC error
  //    via the normal 500 path.
  let isBlocked: boolean;
  try {
    isBlocked = await pairingIsBlocked(service, p.id);
  } catch (err) {
    console.error("[api/pairings/refresh] Block check error:", err);
    return json({ error: "Failed to refresh comparison report." }, 500);
  }
  if (isBlocked) {
    return json({ error: "Pairing not found." }, 404);
  }
  if (!p.invitee_user_id || !p.invitee_session_id || p.status !== "completed") {
    return json({ error: "This pairing has not been accepted yet." }, 400);
  }

  // 5. Resolve each partner's most recent completed assessment session so
  //    a retaken assessment is reflected; fall back to pinned sessions.
  const inviterSessionId = await resolveLatestCompletedSession(
    service,
    p.inviter_user_id,
    p.inviter_session_id,
  );
  const inviteeSessionId = await resolveLatestCompletedSession(
    service,
    p.invitee_user_id,
    p.invitee_session_id,
  );
  if (!inviterSessionId || !inviteeSessionId) {
    return json({ error: "Blueprint results are not available for both partners." }, 400);
  }

  // 6. Fetch both partners' results via the service client (cross-user
  //    blueprint_results reads are blocked by RLS).
  const inviterResults = await getSessionResults(service, inviterSessionId, p.inviter_user_id);
  const inviteeResults = await getSessionResults(service, inviteeSessionId, p.invitee_user_id);
  if (!inviterResults || !inviteeResults) {
    return json({ error: "Blueprint results are not available for both partners." }, 400);
  }

  // 7. Regenerate the report and upsert it.
  const saved = await saveComparisonReport(p.id, inviterResults, inviteeResults);
  if (!saved.ok || !saved.report) {
    return json({ error: saved.error ?? "Failed to refresh comparison report." }, 500);
  }

  // 8. Refresh the pairing's alignment_results to match.
  const alignmentResults = computeAlignment(inviterResults, inviteeResults);
  const { error: alignmentError } = await service
    .from("pairings")
    .update({ alignment_results: alignmentResults })
    .eq("id", p.id);
  if (alignmentError) {
    console.error("[api/pairings/refresh] Alignment update error:", alignmentError.message);
    // Non-fatal: the report itself is fresh; the pairing snapshot is
    // best-effort and can be fixed by the next refresh.
  }

  // 9. Audit (non-fatal).
  await auditLog(userId, "comparison_report.refresh", "comparison_reports", p.id, {
    overall_compatibility: saved.report.overallCompatibility,
  });

  // 10. Return the fresh report so the mobile client can render it without
  //    an extra read.
  return json({ success: true, pairingId: p.id, report: saved.report }, 200);
}
