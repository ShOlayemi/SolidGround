"use server";

// ──────────────────────────────────────────────────────────────
// SolidGround AI — Pairing Server Actions
// ──────────────────────────────────────────────────────────────

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  PairingWithNames,
  ComparisonReport,
  PairingMessage,
} from "@/types";
import { computeAlignment, generateComparisonReport } from "./alignment";
import type { BlueprintResults } from "@/lib/scoring/types";
import { sendPartnerInviteEmail } from "@/lib/email/send";
import { createNotification } from "@/lib/notifications/actions";

// ── Helpers ───────────────────────────────────────────────────

type AuthResult =
  | { success: true; userId: string; supabase: SupabaseClient }
  | { success: false; error: string };

async function requireUserId(): Promise<AuthResult> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return { success: false, error: "Not authenticated." };
  }
  return { success: true, userId: session.user.id, supabase };
}

async function auditLog(
  supabase: SupabaseClient,
  userId: string,
  action: string,
  resource: string,
  resourceId: string,
  details: Record<string, unknown>,
): Promise<void> {
  try {
    await supabase.from("audit_logs").insert({
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
async function getSessionResults(
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

/** Verify the auth'd user is a partner in the given pairing. */
async function verifyPartner(
  supabase: SupabaseClient,
  pairingId: string,
  userId: string,
): Promise<{ valid: boolean; pairing?: { inviter_user_id: string; invitee_user_id: string | null; inviter_session_id: string; invitee_session_id: string | null } }> {
  const { data: pairing, error } = await supabase
    .from("pairings")
    .select("inviter_user_id, invitee_user_id, inviter_session_id, invitee_session_id")
    .eq("id", pairingId)
    .single();

  if (error || !pairing) return { valid: false };

  if (pairing.inviter_user_id !== userId && pairing.invitee_user_id !== userId) {
    return { valid: false };
  }

  return { valid: true, pairing };
}

// ── Server Actions ────────────────────────────────────────────

/**
 * Create an invite link from a completed assessment session.
 * Generates a unique invite code and creates a pending pairing.
 */
export async function createInvite(
  sessionId: string,
  inviteeEmail?: string,
): Promise<{ success: boolean; inviteCode?: string; pairingId?: string; error?: string }> {
  const auth = await requireUserId();
  if (!auth.success) return auth;

  const { supabase, userId } = auth;

  // Verify session belongs to user and is completed
  const { data: session, error: sessionError } = await supabase
    .from("assessment_sessions")
    .select("id, user_id, status")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    return { success: false, error: "Session not found." };
  }
  if (session.user_id !== userId) {
    return { success: false, error: "Not authorized." };
  }
  if (session.status !== "completed") {
    return { success: false, error: "Complete your assessment before creating an invite." };
  }

  // Verify session has blueprint_results
  const results = await getSessionResults(supabase, sessionId, userId);
  if (!results) {
    return { success: false, error: "No blueprint results found. Please compute your results first." };
  }

  // Generate unique invite code
  const inviteCode = crypto.randomUUID().slice(0, 8);

  // Insert pairing with inviter's results stored in alignment_results
  // so acceptInvite can read them without cross-user blueprint_results RLS issues.
  const inviterResultsPayload = {
    sessionId: results.sessionId,
    userId: results.userId,
    categoryResults: results.categoryResults,
    overallScore: results.overallScore,
    overallConfidence: results.overallConfidence,
    completedAt: results.completedAt,
  };

  const { data: pairing, error: insertError } = await supabase
    .from("pairings")
    .insert({
      invite_code: inviteCode,
      inviter_user_id: userId,
      inviter_session_id: sessionId,
      status: "pending",
      alignment_results: { inviter_results: inviterResultsPayload },
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("Error creating pairing:", insertError);
    return { success: false, error: "Failed to create invite." };
  }

  await auditLog(supabase, userId, "pairing.create", "pairings", pairing.id, {
    invite_code: inviteCode,
  });

  // Email delivery is optional: the invite link remains available for copy/share.
  const { data: inviterProfile } = await supabase.from("profiles").select("display_name, full_name").eq("id", userId).maybeSingle();
  const inviterName = inviterProfile?.display_name ?? inviterProfile?.full_name ?? "Someone";
  if (inviteeEmail) {
    void sendPartnerInviteEmail(inviteeEmail, inviterName, `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://solidground.ai"}/invite/${inviteCode}`);
  }

  return { success: true, inviteCode, pairingId: pairing.id };
}

/**
 * Get public info about an invite (for the accept page).
 * Does not require auth — returns enough info to show the invite page.
 */
export async function getInvite(
  inviteCode: string,
): Promise<{
  success: boolean;
  inviterName?: string;
  status?: string;
  error?: string;
}> {
  // Use service client — RLS blocks unauthenticated/invitee reads of pending pairings
  const serviceClient = await createServiceClient();

  const { data: pairing, error } = await serviceClient
    .from("pairings")
    .select("invite_code, inviter_user_id, status")
    .eq("invite_code", inviteCode)
    .single();

  if (error || !pairing) {
    return { success: false, error: "Invite not found." };
  }

  // Get inviter's name — use service client for the profile read
  const { data: inviterProfile } = await serviceClient
    .from("profiles")
    .select("display_name, full_name")
    .eq("id", pairing.inviter_user_id)
    .maybeSingle();
  const inviterName = inviterProfile?.display_name ?? inviterProfile?.full_name ?? "Someone";

  return {
    success: true,
    inviterName,
    status: pairing.status,
  };
}

/**
 * Accept an invite. Auth required.
 * Links the invitee's completed session, computes alignment,
 * and generates a comparison report.
 */
export async function acceptInvite(
  inviteCode: string,
): Promise<{ success: boolean; pairingId?: string; error?: string }> {
  const auth = await requireUserId();
  if (!auth.success) return auth;

  const { supabase, userId } = auth;

  // Use service client to read pairing (RLS blocks invitee from reading
  // pending pairings because invitee_user_id is still null at this point).
  const serviceClientForPairing = await createServiceClient();
  const { data: pairing, error: pairingError } = await serviceClientForPairing
    .from("pairings")
    .select("id, invite_code, inviter_user_id, invitee_user_id, inviter_session_id, invitee_session_id, status, alignment_results, created_at, updated_at")
    .eq("invite_code", inviteCode)
    .single();

  if (pairingError || !pairing) {
    return { success: false, error: "Invite not found." };
  }
  if (pairing.status !== "pending") {
    return { success: false, error: "This invite is no longer available." };
  }
  if (pairing.inviter_user_id === userId) {
    return { success: false, error: "You cannot accept your own invite." };
  }

  // Find invitee's completed session with results
  const { data: completedSession } = await supabase
    .from("assessment_sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!completedSession) {
    return { success: false, error: "Complete your Compatibility Blueprint before accepting an invite." };
  }

  // Verify invitee has blueprint results
  const inviteeResults = await getSessionResults(supabase, completedSession.id, userId);
  if (!inviteeResults) {
    return { success: false, error: "Your results are not ready. Please compute your blueprint first." };
  }

  // Read inviter's results from the pairing (stored at invite creation to avoid RLS issues)
  let inviterResultsData = (pairing.alignment_results as Record<string, unknown> | null)?.inviter_results as {
    sessionId: string;
    userId: string;
    categoryResults: BlueprintResults["categoryResults"];
    overallScore: number;
    overallConfidence: number;
    completedAt: string;
  } | undefined;

  // Fallback: if inviter_results not embedded (old invite), query blueprint_results via service client
  if (!inviterResultsData) {
    console.log("[acceptInvite] No embedded inviter_results, falling back to service client query");
    const { data: row, error: svcErr } = await serviceClientForPairing
      .from("blueprint_results")
      .select("session_id, user_id, category_results, overall_score, overall_confidence, created_at, updated_at")
      .eq("session_id", pairing.inviter_session_id)
      .eq("user_id", pairing.inviter_user_id)
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
    console.error("[acceptInvite] No inviter_results found in pairing or blueprint_results");
    return { success: false, error: "The inviter's results are not available." };
  }

  console.log("[acceptInvite] Found inviter results in pairing, overall_score:", inviterResultsData.overallScore);

  const inviterResults: BlueprintResults = {
    sessionId: inviterResultsData.sessionId,
    userId: inviterResultsData.userId,
    categoryResults: inviterResultsData.categoryResults,
    overallScore: inviterResultsData.overallScore,
    overallConfidence: inviterResultsData.overallConfidence,
    completedAt: inviterResultsData.completedAt,
  };

  // Compute alignment
  const alignmentResults = computeAlignment(inviterResults, inviteeResults);

  // Update pairing — use service client since invitee isn't in RLS policy yet
  const serviceClientForUpdate = await createServiceClient();
  const { error: updateError } = await serviceClientForUpdate
    .from("pairings")
    .update({
      invitee_user_id: userId,
      invitee_session_id: completedSession.id,
      status: "completed",
      alignment_results: alignmentResults,
    })
    .eq("id", pairing.id);

  if (updateError) {
    console.error("Error updating pairing:", updateError);
    return { success: false, error: "Failed to accept invite." };
  }

  // Generate and save comparison report (use service client so it works regardless of RLS)
  try {
    const report = generateComparisonReport(pairing.id, inviterResults, inviteeResults);
    const serviceClientForReport = await createServiceClient();
    await serviceClientForReport.from("comparison_reports").upsert(
      {
        pairing_id: pairing.id,
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
  } catch (err) {
    console.error("Failed to save comparison report:", err);
    // Non-fatal: pairing is still accepted, report can be regenerated later
  }

  await auditLog(supabase, userId, "pairing.accept", "pairings", pairing.id, {
    invite_code: inviteCode,
    overall_alignment: alignmentResults.overallAlignment,
  });
  await createNotification(
    pairing.inviter_user_id,
    "invite_accepted",
    "Partner invite accepted",
    "Your partner has accepted the invitation and your alignment report is ready.",
    { pairing_id: pairing.id, href: `/dashboard/pairings/${pairing.id}` },
  );

  return { success: true, pairingId: pairing.id };
}

/**
 * Get full pairing results (auth check: must be inviter or invitee).
 */
export async function getPairingResults(
  pairingId: string,
): Promise<{ success: boolean; pairing?: PairingWithNames; error?: string }> {
  const auth = await requireUserId();
  if (!auth.success) return auth;

  const { supabase, userId } = auth;

  // Fetch pairing with RLS — will only return if user is inviter or invitee
  const { data: pairing, error } = await supabase
    .from("pairings")
    .select("id, invite_code, inviter_user_id, invitee_user_id, inviter_session_id, invitee_session_id, status, alignment_results, created_at, updated_at")
    .eq("id", pairingId)
    .single();

  if (error || !pairing) {
    return { success: false, error: "Pairing not found." };
  }

  // Fetch names for both users
  const userIds = [pairing.inviter_user_id];
  if (pairing.invitee_user_id) userIds.push(pairing.invitee_user_id);

  // Use service client to read all profiles (RLS restricts to own profile only)
  const serviceClientForPairingProfiles = await createServiceClient();
  const { data: profiles } = await serviceClientForPairingProfiles
    .from("profiles")
    .select("id, display_name, full_name")
    .in("id", userIds);

  const profileMap = new Map<string, string>();
  for (const p of profiles ?? []) {
    profileMap.set(p.id, p.display_name ?? p.full_name ?? "Unknown");
  }

  const result: PairingWithNames = {
    id: pairing.id,
    invite_code: pairing.invite_code,
    inviter_user_id: pairing.inviter_user_id,
    inviter_name: profileMap.get(pairing.inviter_user_id) ?? "Unknown",
    inviter_session_id: pairing.inviter_session_id,
    invitee_user_id: pairing.invitee_user_id,
    invitee_name: pairing.invitee_user_id
      ? (profileMap.get(pairing.invitee_user_id) ?? "Unknown")
      : null,
    invitee_session_id: pairing.invitee_session_id,
    status: pairing.status,
    alignment_results: pairing.alignment_results ?? null,
    created_at: pairing.created_at,
    updated_at: pairing.updated_at,
  };

  return { success: true, pairing: result };
}

/**
 * Get all pairings for the current user (both inviter and invitee).
 */
export async function getMyPairings(): Promise<{
  success: boolean;
  pairings?: PairingWithNames[];
  error?: string;
}> {
  const auth = await requireUserId();
  if (!auth.success) return auth;

  const { supabase, userId } = auth;

  // Fetch pairings where user is inviter OR invitee
  const { data: pairings, error } = await supabase
    .from("pairings")
    .select("id, invite_code, inviter_user_id, invitee_user_id, inviter_session_id, invitee_session_id, status, alignment_results, created_at, updated_at")
    .or(`inviter_user_id.eq.${userId},invitee_user_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching pairings:", error);
    return { success: false, error: "Failed to fetch pairings." };
  }

  if (!pairings || pairings.length === 0) {
    return { success: true, pairings: [] };
  }

  // Collect all user IDs
  const userIds = new Set<string>();
  for (const p of pairings) {
    userIds.add(p.inviter_user_id);
    if (p.invitee_user_id) userIds.add(p.invitee_user_id);
  }

  // Use service client to read all profiles (RLS restricts to own profile only)
  const serviceClientForMyPairings = await createServiceClient();
  const { data: profiles } = await serviceClientForMyPairings
    .from("profiles")
    .select("id, display_name, full_name")
    .in("id", Array.from(userIds));

  const profileMap = new Map<string, string>();
  for (const p of profiles ?? []) {
    profileMap.set(p.id, p.display_name ?? p.full_name ?? "Unknown");
  }

  const results: PairingWithNames[] = pairings.map((p) => ({
    id: p.id,
    invite_code: p.invite_code,
    inviter_user_id: p.inviter_user_id,
    inviter_name: profileMap.get(p.inviter_user_id) ?? "Unknown",
    inviter_session_id: p.inviter_session_id,
    invitee_user_id: p.invitee_user_id,
    invitee_name: p.invitee_user_id
      ? (profileMap.get(p.invitee_user_id) ?? "Unknown")
      : null,
    invitee_session_id: p.invitee_session_id,
    status: p.status,
    alignment_results: p.alignment_results ?? null,
    created_at: p.created_at,
    updated_at: p.updated_at,
  }));

  return { success: true, pairings: results };
}

// ── Enhanced Actions (Sprint 6) ───────────────────────────────

/**
 * Save a comparison report for a pairing.
 * Fetches both users' blueprint_results, generates the report,
 * and upserts into the comparison_reports table.
 */
export async function saveComparisonReport(
  pairingId: string,
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireUserId();
  if (!auth.success) return auth;

  const { supabase, userId } = auth;

  // Verify user is a partner in the pairing
  const partnerCheck = await verifyPartner(supabase, pairingId, userId);
  if (!partnerCheck.valid || !partnerCheck.pairing) {
    return { success: false, error: "You are not a partner in this pairing." };
  }

  const p = partnerCheck.pairing;
  if (!p.invitee_user_id || !p.invitee_session_id) {
    return { success: false, error: "This pairing has not been accepted yet." };
  }

  // Fetch both users' results via service client (bypass RLS for cross-user reads)
  const serviceClient = await createServiceClient();

  const { data: inviterResultRow, error: inviterFetchError } = await serviceClient
    .from("blueprint_results")
    .select("session_id, user_id, category_results, overall_score, overall_confidence, created_at, updated_at")
    .eq("session_id", p.inviter_session_id)
    .eq("user_id", p.inviter_user_id)
    .maybeSingle();
  if (inviterFetchError || !inviterResultRow) {
    return { success: false, error: "Inviter's blueprint results are not available." };
  }

  const inviterResults: BlueprintResults = {
    sessionId: inviterResultRow.session_id,
    userId: inviterResultRow.user_id,
    categoryResults: inviterResultRow.category_results,
    overallScore: inviterResultRow.overall_score,
    overallConfidence: inviterResultRow.overall_confidence,
    completedAt: inviterResultRow.updated_at ?? inviterResultRow.created_at,
  };

  const { data: inviteeResultRow, error: inviteeFetchError } = await serviceClient
    .from("blueprint_results")
    .select("session_id, user_id, category_results, overall_score, overall_confidence, created_at, updated_at")
    .eq("session_id", p.invitee_session_id)
    .eq("user_id", p.invitee_user_id)
    .maybeSingle();
  if (inviteeFetchError || !inviteeResultRow) {
    return { success: false, error: "Invitee's blueprint results are not available." };
  }

  const inviteeResults: BlueprintResults = {
    sessionId: inviteeResultRow.session_id,
    userId: inviteeResultRow.user_id,
    categoryResults: inviteeResultRow.category_results,
    overallScore: inviteeResultRow.overall_score,
    overallConfidence: inviteeResultRow.overall_confidence,
    completedAt: inviteeResultRow.updated_at ?? inviteeResultRow.created_at,
  };

  // Generate and upsert report
  const report = generateComparisonReport(pairingId, inviterResults, inviteeResults);

  const { error: upsertError } = await supabase
    .from("comparison_reports")
    .upsert(
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

  if (upsertError) {
    console.error("Error saving comparison report:", upsertError);
    return { success: false, error: "Failed to save comparison report." };
  }

  await auditLog(supabase, userId, "comparison_report.save", "comparison_reports", pairingId, {
    overall_compatibility: report.overallCompatibility,
  });

  return { success: true };
}

/**
 * Get a comparison report for a pairing.
 * Returns the report or null if none exists.
 */
export async function getComparisonReport(
  pairingId: string,
): Promise<{ success: boolean; report?: ComparisonReport | null; error?: string }> {
  const auth = await requireUserId();
  if (!auth.success) return auth;

  const { supabase } = auth;

  const { data: row, error } = await supabase
    .from("comparison_reports")
    .select("pairing_id, overall_compatibility, category_comparisons, shared_strengths, potential_conflicts, conversation_guides, growth_opportunities, deal_breaker_intersections")
    .eq("pairing_id", pairingId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching comparison report:", error);
    return { success: false, error: "Failed to fetch comparison report." };
  }

  if (!row) {
    return { success: true, report: null };
  }

  const report: ComparisonReport = {
    pairingId: row.pairing_id,
    overallCompatibility: row.overall_compatibility,
    categoryComparisons: row.category_comparisons,
    sharedStrengths: row.shared_strengths,
    potentialConflicts: row.potential_conflicts,
    conversationGuides: row.conversation_guides,
    growthOpportunities: row.growth_opportunities,
    dealBreakerIntersections: row.deal_breaker_intersections,
  };

  return { success: true, report };
}

/**
 * Send a message in a pairing chat.
 * Validates that the sender is a partner in the pairing.
 */
export async function sendMessage(
  pairingId: string,
  content: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const auth = await requireUserId();
  if (!auth.success) return auth;

  const { supabase, userId } = auth;

  if (!content || content.trim().length === 0) {
    return { success: false, error: "Message content is required." };
  }

  // Verify user is a partner
  const partnerCheck = await verifyPartner(supabase, pairingId, userId);
  if (!partnerCheck.valid) {
    return { success: false, error: "You are not a partner in this pairing." };
  }

  const { data: message, error } = await supabase
    .from("pairing_messages")
    .insert({
      pairing_id: pairingId,
      sender_user_id: userId,
      content: content.trim(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error sending message:", error);
    return { success: false, error: "Failed to send message." };
  }

  return { success: true, messageId: message.id };
}

/**
 * Get all messages for a pairing, ordered by created_at ASC.
 * Returns messages with sender names and isCurrentUser flags.
 */
export async function getMessages(
  pairingId: string,
): Promise<{ success: boolean; messages?: PairingMessage[]; error?: string }> {
  const auth = await requireUserId();
  if (!auth.success) return auth;

  const { supabase, userId } = auth;

  // Verify user is a partner
  const partnerCheck = await verifyPartner(supabase, pairingId, userId);
  if (!partnerCheck.valid) {
    return { success: false, error: "You are not a partner in this pairing." };
  }

  const { data: rows, error } = await supabase
    .from("pairing_messages")
    .select("id, pairing_id, sender_user_id, content, created_at")
    .eq("pairing_id", pairingId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching messages:", error);
    return { success: false, error: "Failed to fetch messages." };
  }

  if (!rows || rows.length === 0) {
    return { success: true, messages: [] };
  }

  // Collect sender user IDs to fetch names
  const senderIds = new Set<string>();
  for (const row of rows) {
    senderIds.add(row.sender_user_id);
  }

  // Use service client to read all profiles (RLS restricts to own profile only)
  const serviceClientForProfiles = await createServiceClient();
  const { data: profiles } = await serviceClientForProfiles
    .from("profiles")
    .select("id, display_name, full_name")
    .in("id", Array.from(senderIds));

  const profileMap = new Map<string, string>();
  for (const p of profiles ?? []) {
    profileMap.set(p.id, p.display_name ?? p.full_name ?? "Unknown");
  }

  const messages: PairingMessage[] = rows.map((row) => ({
    id: row.id,
    pairingId: row.pairing_id,
    senderUserId: row.sender_user_id,
    content: row.content,
    createdAt: row.created_at,
    senderName: profileMap.get(row.sender_user_id) ?? "Unknown",
    isCurrentUser: row.sender_user_id === userId,
  }));

  return { success: true, messages };
}

/**
 * Refresh a comparison report by re-fetching both users' latest results,
 * regenerating the report, and upserting into comparison_reports.
 */
export async function refreshReport(
  pairingId: string,
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireUserId();
  if (!auth.success) return auth;

  const { supabase, userId } = auth;

  // Verify user is a partner in the pairing
  const partnerCheck = await verifyPartner(supabase, pairingId, userId);
  if (!partnerCheck.valid || !partnerCheck.pairing) {
    return { success: false, error: "You are not a partner in this pairing." };
  }

  const p = partnerCheck.pairing;
  if (!p.invitee_user_id || !p.invitee_session_id) {
    return { success: false, error: "This pairing has not been accepted yet." };
  }

  // Re-fetch both users' results via service client (bypass RLS)
  const serviceClient2 = await createServiceClient();

  const { data: inviterResultRow, error: inviterFetchError } = await serviceClient2
    .from("blueprint_results")
    .select("session_id, user_id, category_results, overall_score, overall_confidence, created_at, updated_at")
    .eq("session_id", p.inviter_session_id)
    .eq("user_id", p.inviter_user_id)
    .maybeSingle();
  if (inviterFetchError || !inviterResultRow) {
    return { success: false, error: "Inviter's blueprint results are not available." };
  }

  const inviterResults: BlueprintResults = {
    sessionId: inviterResultRow.session_id,
    userId: inviterResultRow.user_id,
    categoryResults: inviterResultRow.category_results,
    overallScore: inviterResultRow.overall_score,
    overallConfidence: inviterResultRow.overall_confidence,
    completedAt: inviterResultRow.updated_at ?? inviterResultRow.created_at,
  };

  const { data: inviteeResultRow, error: inviteeFetchError } = await serviceClient2
    .from("blueprint_results")
    .select("session_id, user_id, category_results, overall_score, overall_confidence, created_at, updated_at")
    .eq("session_id", p.invitee_session_id)
    .eq("user_id", p.invitee_user_id)
    .maybeSingle();
  if (inviteeFetchError || !inviteeResultRow) {
    return { success: false, error: "Invitee's blueprint results are not available." };
  }

  const inviteeResults: BlueprintResults = {
    sessionId: inviteeResultRow.session_id,
    userId: inviteeResultRow.user_id,
    categoryResults: inviteeResultRow.category_results,
    overallScore: inviteeResultRow.overall_score,
    overallConfidence: inviteeResultRow.overall_confidence,
    completedAt: inviteeResultRow.updated_at ?? inviteeResultRow.created_at,
  };

  // Regenerate report
  const report = generateComparisonReport(pairingId, inviterResults, inviteeResults);

  // Update comparison_reports
  const { error: upsertError } = await supabase
    .from("comparison_reports")
    .upsert(
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

  if (upsertError) {
    console.error("Error refreshing comparison report:", upsertError);
    return { success: false, error: "Failed to refresh comparison report." };
  }

  // Also update the pairing's alignment_results with fresh alignment
  const alignmentResults = computeAlignment(inviterResults, inviteeResults);
  await supabase
    .from("pairings")
    .update({ alignment_results: alignmentResults })
    .eq("id", pairingId);

  await auditLog(supabase, userId, "comparison_report.refresh", "comparison_reports", pairingId, {
    overall_compatibility: report.overallCompatibility,
  });

  return { success: true };
}
