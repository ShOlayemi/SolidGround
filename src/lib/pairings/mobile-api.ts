// ──────────────────────────────────────────────────────────────
// SolidGround AI — Mobile Pairing API shared helpers
// ──────────────────────────────────────────────────────────────
// MOBILE-CLIENT ADD (owner-approved, Sprint 6 / S6-1): shared plumbing
// for the three mobile-facing pairing routes under
// src/app/api/pairings/{accept,disconnect,refresh}. NEW code only — no
// existing web-app behavior, file, migration, or RLS policy is touched.
//
// Why server-side (design constraint, mirrors src/lib/pairings/actions.ts):
//   • accept — pairings.invitee_user_id is NULL until accept, so the
//     pairings UPDATE policy (auth.uid() = inviter OR invitee) excludes
//     the recipient; and the anon-key "pending pairing by code" SELECT
//     policy exposes every pairing column to anyone holding the code,
//     so the mobile client must NEVER read pairings by code directly.
//     The accept route reads by code with the SERVICE client and
//     returns only { success, pairingId }.
//   • disconnect — pairings has no DELETE policy at all; deletion is a
//     service-client-only operation.
//   • refresh — cross-user blueprint_results reads must bypass RLS.
//
// The mobile client authenticates with its Supabase ACCESS TOKEN in the
// Authorization header; every route validates it via
// supabase.auth.getUser(token) and attaches it to a token-bound client
// so PostgREST RLS applies exactly as for the web app's cookie sessions
// (mirrors src/app/api/blueprint/results/route.ts).
//
// Auth response contract (shared by all three routes):
//   401  missing/invalid token;  400  bad request body;
//   404  resource not found;     403  authenticated but not a participant;
//   500  server error — errors are mapped to { error: string }, raw DB
//        errors are never leaked to the client.
// ──────────────────────────────────────────────────────────────
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/server";
import { generateComparisonReport } from "./alignment";
import type { BlueprintResults } from "@/lib/scoring/types";
import type { ComparisonReport, RelationshipType } from "@/types";

/** CORS headers for browser (mobile web build) callers. */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
} as const;

/** JSON response with CORS headers on every response. */
export function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: CORS_HEADERS });
}

/** CORS preflight (each route re-exports this as OPTIONS). */
export function optionsResponse() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export type AuthResult =
  | { ok: true; userId: string; supabase: SupabaseClient }
  | { ok: false; response: NextResponse };

/**
 * Authenticate a mobile request from its bearer token. Mirrors the
 * blueprint/results route: token-bound client (anon key + the caller's
 * access token, so RLS applies) plus an explicit getUser() check.
 */
export async function authenticateRequest(request: Request): Promise<AuthResult> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : null;
  if (!token) {
    return { ok: false, response: json({ error: "Authentication required" }, 401) };
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[api/pairings] Missing Supabase env configuration");
    return { ok: false, response: json({ error: "Server configuration error." }, 500) };
  }
  const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) {
    return { ok: false, response: json({ error: "Authentication required" }, 401) };
  }
  return { ok: true, userId: authData.user.id, supabase };
}

/** Write an audit row (service client so it always succeeds). */
export async function auditLog(
  userId: string,
  action: string,
  resource: string,
  resourceId: string,
  details: Record<string, unknown>,
): Promise<void> {
  try {
    const service = await createServiceClient();
    await service.from("audit_logs").insert({
      user_id: userId,
      action,
      resource,
      resource_id: resourceId,
      details,
    });
  } catch (err) {
    console.error("Audit log error:", err);
  }
}

/** Fetch BlueprintResults for a session (must belong to user). */
export async function getSessionResults(
  supabase: SupabaseClient,
  sessionId: string,
  userId: string,
): Promise<BlueprintResults | null> {
  const { data: row, error } = await supabase
    .from("blueprint_results")
    .select("session_id, user_id, category_results, overall_score, overall_confidence, created_at, updated_at")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !row) return null;
  return {
    sessionId: row.session_id,
    userId: row.user_id,
    categoryResults: row.category_results,
    overallScore: row.overall_score,
    overallConfidence: row.overall_confidence,
    completedAt: row.updated_at ?? row.created_at,
  };
}

/**
 * Resolve a user's most recent completed assessment session, falling back
 * to the pairing's pinned session (defensive — a pairing is created from a
 * completed session, so the fallback only matters if it was deleted or its
 * status changed). Mirrors actions.ts resolveLatestCompletedSession.
 */
export async function resolveLatestCompletedSession(
  supabase: SupabaseClient,
  userId: string,
  pinnedSessionId: string | null,
): Promise<string | null> {
  const { data: session } = await supabase
    .from("assessment_sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return session?.id ?? pinnedSessionId;
}

/**
 * Generate a comparison report from both partners' BlueprintResults and
 * upsert it into comparison_reports (service client, onConflict pairing_id).
 * Returns the report so callers can echo it back to the mobile client.
 */
export async function saveComparisonReport(
  pairingId: string,
  inviterResults: BlueprintResults,
  inviteeResults: BlueprintResults,
): Promise<{ ok: boolean; report?: ComparisonReport; error?: string }> {
  try {
    const report = generateComparisonReport(pairingId, inviterResults, inviteeResults);
    const service = await createServiceClient();
    const { error } = await service.from("comparison_reports").upsert(
      {
        pairing_id: pairingId,
        overall_compatibility: report.overallCompatibility,
        category_comparisons: report.categoryComparisons,
        shared_strengths: report.sharedStrengths,
        potential_conflicts: report.potentialConflicts,
        conversation_guides: report.conversationGuides,
        growth_opportunities: report.growthOpportunities,
        deal_breaker_intersections: report.dealBreakerIntersections,
      },
      { onConflict: "pairing_id" },
    );
    if (error) {
      console.error("[api/pairings] Comparison report upsert error:", error.message);
      return { ok: false, error: "Failed to save comparison report." };
    }
    return { ok: true, report };
  } catch (err) {
    console.error("[api/pairings] Comparison report error:", err);
    return { ok: false, error: "Failed to save comparison report." };
  }
}

/**
 * Notify the pairing inviter that their invite was accepted. Replicates
 * createNotification()'s cross-user path (src/lib/notifications/actions.ts):
 * honor in-app notification preferences, then emit via the SECURITY
 * DEFINER RPC create_notification_for_user (migration 020). Service client
 * so it works for the mobile caller. Non-fatal on error.
 */
export async function notifyInviteAccepted(
  inviterUserId: string,
  relationshipType: RelationshipType,
  pairingId: string,
): Promise<void> {
  try {
    const service = await createServiceClient();
    const { data: prefs } = await service
      .from("profiles")
      .select("notification_preferences")
      .eq("id", inviterUserId)
      .maybeSingle();
    const inApp = (
      prefs?.notification_preferences as
        | { in_app?: Record<string, boolean> }
        | null
        | undefined
    )?.in_app;
    if (inApp && inApp["invite_accepted"] === false) return;
    const label = relationshipType === "platonic" ? "friend" : "partner";
    await service.rpc("create_notification_for_user", {
      target_user_id: inviterUserId,
      notification_type: "invite_accepted",
      notification_title: `${label.charAt(0).toUpperCase() + label.slice(1)} invite accepted`,
      notification_message: `Your ${label} has accepted the invitation and your alignment report is ready.`,
      notification_data: { pairing_id: pairingId, href: `/dashboard/pairings/${pairingId}` },
    });
  } catch (err) {
    console.error("[api/pairings] Invite-accepted notification error:", err);
  }
}
