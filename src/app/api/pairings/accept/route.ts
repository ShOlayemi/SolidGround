// ──────────────────────────────────────────────────────────────
// SolidGround AI — Mobile Pairing Accept API (ADD for mobile client)
// ──────────────────────────────────────────────────────────────
// MOBILE-CLIENT ADD (owner-approved, Sprint 6 / S6-1): a bearer-token
// endpoint for the React Native app to accept a pending pairing by its
// 8-char invite code. NEW route only — no existing web-app behavior,
// file, migration, or RLS policy is touched.
//
// WHY SERVER-SIDE: pairings.invitee_user_id is NULL until accept, so the
// pairings UPDATE policy (auth.uid() = inviter OR invitee) excludes the
// recipient — a client-side (anon-key) accept is blocked by RLS. The web
// app performs accept server-side via its service client (acceptInvite in
// src/lib/pairings/actions.ts); this route composes the SAME steps for
// the mobile bearer-token caller. It also honors the privacy rule that
// the mobile client NEVER queries pairings by code with the anon key (the
// "pending pairing by code" policy would leak every pairing column to
// anyone holding the code): the code is resolved ONLY by the service
// client here, and the response exposes only { success, pairingId }.
//
// MOBILE CONSUMER CONTRACT:
//   POST /api/pairings/accept
//   Authorization: Bearer <supabase access token>
//   Body: { "inviteCode": "8-char-code" }
//   200 { "success": true, "pairingId": "uuid" }
//   400 { "error": "..." }  bad body / invite no longer available /
//                           expired / own invite / no completed blueprint
//   401 { "error": "..." }  missing or invalid token
//   404 { "error": "..." }  invite code not found
//   500 { "error": "..." }  server failure (never a raw DB error)
//
// Side effects (identical to acceptInvite): pairing → status 'completed'
// with invitee ids + fresh alignment_results; invitation lifecycle row →
// 'accepted' + accepted_at (backfilled for invites created before
// migration 034, which the web app never wrote); comparison_reports
// upserted via generateComparisonReport; in-app notification to the
// inviter via create_notification_for_user; audit row.
// ──────────────────────────────────────────────────────────────
import { createServiceClient } from "@/lib/supabase/server";
import { computeAlignment } from "@/lib/pairings/alignment";
import {
  authenticateRequest,
  auditLog,
  getSessionResults,
  json,
  notifyInviteAccepted,
  optionsResponse,
  saveComparisonReport,
} from "@/lib/pairings/mobile-api";
import { pairingIsBlocked } from "@/lib/pairings/blocked";
import type { BlueprintResults } from "@/lib/scoring/types";

export const runtime = "nodejs";

/** CORS preflight. */
export async function OPTIONS() {
  return optionsResponse();
}

type PairingRow = {
  id: string;
  invite_code: string;
  inviter_user_id: string;
  invitee_user_id: string | null;
  inviter_session_id: string;
  invitee_session_id: string | null;
  status: string;
  relationship_type: string | null;
  alignment_results: Record<string, unknown> | null;
  created_at: string;
};

type InvitationRow = {
  id: string;
  pairing_id: string;
  status: string;
  expires_at: string;
};

/**
 * POST /api/pairings/accept — accept a pending pairing by invite code.
 */
export async function POST(request: Request) {
  // 1. Bearer-token authentication.
  const auth = await authenticateRequest(request);
  if (!auth.ok) return auth.response;
  const { userId, supabase } = auth;

  // 2. Parse the request body.
  let rawInviteCode: unknown;
  try {
    const body = (await request.json()) as { inviteCode?: unknown };
    rawInviteCode = body?.inviteCode;
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }
  if (typeof rawInviteCode !== "string" || rawInviteCode.trim().length === 0) {
    return json({ error: "inviteCode is required." }, 400);
  }
  const inviteCode = rawInviteCode.trim();

  // 3. Resolve the pairing by code — SERVICE client only (see header:
  //    the anon-key "pending pairing by code" policy must never be hit
  //    by the mobile client).
  const service = await createServiceClient();
  const { data: pairing, error: pairingError } = await service
    .from("pairings")
    .select("id, invite_code, inviter_user_id, invitee_user_id, inviter_session_id, invitee_session_id, status, relationship_type, alignment_results, created_at")
    .eq("invite_code", inviteCode)
    .single();
  if (pairingError || !pairing) {
    return json({ error: "Invite not found." }, 404);
  }
  const p = pairing as PairingRow;
  if (p.status !== "pending") {
    return json({ error: "This invite is no longer available." }, 400);
  }
  if (p.inviter_user_id === userId) {
    return json({ error: "You cannot accept your own invite." }, 400);
  }

  // 4. Blocked-user enforcement (Sprint 8 §7, migration 036). The
  //    service client bypasses RLS, so the route must enforce blocking
  //    itself. A block in EITHER direction makes the pairing invisible:
  //    respond with the same generic copy as an unavailable invite so
  //    the caller can never learn a block exists. Fail closed on RPC
  //    error via the normal 500 path.
  let isBlocked: boolean;
  try {
    isBlocked = await pairingIsBlocked(service, p.id);
  } catch (err) {
    console.error("[api/pairings/accept] Block check error:", err);
    return json({ error: "Failed to load invite." }, 500);
  }
  if (isBlocked) {
    return json({ error: "This invite is no longer available." }, 400);
  }

  // 5. Invitation lifecycle check. An invite created before migration 034
  //    has no lifecycle row (the web app's createInvite never writes
  //    pairing_invitations), so accept works for both cases:
  //      row exists  → must be pending and not expired, then marked accepted.
  //      no row      → legacy web invite; backfilled as 'accepted' below.
  const { data: invitation, error: invitationError } = await service
    .from("pairing_invitations")
    .select("id, pairing_id, status, expires_at")
    .eq("invite_token", inviteCode)
    .maybeSingle();
  if (invitationError) {
    console.error("[api/pairings/accept] Invitation query error:", invitationError.message);
    return json({ error: "Failed to load invite." }, 500);
  }
  if (invitation) {
    const inv = invitation as InvitationRow;
    if (inv.status !== "pending") {
      return json({ error: "This invite is no longer available." }, 400);
    }
    if (new Date(inv.expires_at).getTime() <= Date.now()) {
      // Mark it expired for lifecycle accuracy; the pairing stays pending
      // so the inviter can re-invite.
      await service.from("pairing_invitations").update({ status: "expired" }).eq("id", inv.id);
      return json({ error: "This invite has expired." }, 400);
    }
  }

  // 6. Invitee's latest completed assessment session + blueprint results
  //    (token-bound client: RLS scopes these to the caller's own rows).
  const { data: completedSession } = await supabase
    .from("assessment_sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!completedSession) {
    return json({ error: "Complete your Compatibility Blueprint before accepting an invite." }, 400);
  }
  const inviteeResults = await getSessionResults(supabase, completedSession.id, userId);
  if (!inviteeResults) {
    return json({ error: "Your results are not ready. Please compute your blueprint first." }, 400);
  }

  // 7. Inviter's results: prefer the results embedded in the pairing at
  //    invite creation (avoids cross-user blueprint_results RLS), falling
  //    back to a service-client read for pre-existing pairings.
  let inviterResultsData = (
    p.alignment_results as Record<string, unknown> | null
  )?.inviter_results as
    | {
        sessionId: string;
        userId: string;
        categoryResults: BlueprintResults["categoryResults"];
        overallScore: number;
        overallConfidence: number;
        completedAt: string;
      }
    | undefined;
  if (!inviterResultsData) {
    const { data: row, error: svcErr } = await service
      .from("blueprint_results")
      .select("session_id, user_id, category_results, overall_score, overall_confidence, created_at, updated_at")
      .eq("session_id", p.inviter_session_id)
      .eq("user_id", p.inviter_user_id)
      .maybeSingle();
    if (!svcErr && row) {
      inviterResultsData = {
        sessionId: row.session_id,
        userId: row.user_id,
        categoryResults: row.category_results as BlueprintResults["categoryResults"],
        overallScore: row.overall_score,
        overallConfidence: row.overall_confidence,
        completedAt: row.updated_at ?? row.created_at,
      };
    }
  }
  if (!inviterResultsData) {
    return json({ error: "The inviter's results are not available." }, 400);
  }
  const inviterResults: BlueprintResults = {
    sessionId: inviterResultsData.sessionId,
    userId: inviterResultsData.userId,
    categoryResults: inviterResultsData.categoryResults,
    overallScore: inviterResultsData.overallScore,
    overallConfidence: inviterResultsData.overallConfidence,
    completedAt: inviterResultsData.completedAt,
  };

  // 8. Compute alignment and complete the pairing (service client — the
  //    invitee is not yet in the RLS UPDATE policy).
  const alignmentResults = computeAlignment(inviterResults, inviteeResults);
  const { error: updateError } = await service
    .from("pairings")
    .update({
      invitee_user_id: userId,
      invitee_session_id: completedSession.id,
      status: "completed",
      alignment_results: alignmentResults,
    })
    .eq("id", p.id);
  if (updateError) {
    console.error("[api/pairings/accept] Pairing update error:", updateError.message);
    return json({ error: "Failed to accept invite." }, 500);
  }

  // 9. Invitation lifecycle: mark accepted (or backfill for legacy invites).
  const nowIso = new Date().toISOString();
  if (invitation) {
    const { error: invUpdateError } = await service
      .from("pairing_invitations")
      .update({ status: "accepted", accepted_at: nowIso })
      .eq("id", (invitation as InvitationRow).id);
    if (invUpdateError) {
      console.error("[api/pairings/accept] Invitation update error:", invUpdateError.message);
      // Non-fatal: the pairing is accepted; the lifecycle row is best-effort.
    }
  } else {
    const { error: invInsertError } = await service.from("pairing_invitations").insert({
      pairing_id: p.id,
      inviter_user_id: p.inviter_user_id,
      invite_token: inviteCode,
      status: "accepted",
      accepted_at: nowIso,
    });
    if (invInsertError) {
      console.error("[api/pairings/accept] Invitation backfill error:", invInsertError.message);
      // Non-fatal: same reasoning as above.
    }
  }

  // 10. Generate + upsert the comparison report (non-fatal on failure —
  //    the pairing is still accepted and the report can be regenerated).
  await saveComparisonReport(p.id, inviterResults, inviteeResults);

  // 11. Notification + audit (non-fatal).
  const relationshipType = p.relationship_type === "platonic" ? "platonic" : "romantic";
  await notifyInviteAccepted(p.inviter_user_id, relationshipType, p.id);
  await auditLog(userId, "pairing.accept", "pairings", p.id, {
    invite_code: inviteCode,
    overall_alignment: alignmentResults.overallAlignment,
  });

  // 12. Minimal response — never echo pairing contents back to the client.
  return json({ success: true, pairingId: p.id }, 200);
}
