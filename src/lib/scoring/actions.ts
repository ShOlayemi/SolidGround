"use server";

// ──────────────────────────────────────────────────────────────
// SolidGround AI — Scoring Server Actions
// ──────────────────────────────────────────────────────────────

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AssessmentAnswer } from "@/types";
import type { BlueprintResults, WeightConfig } from "./types";
import { computeBlueprintResults } from "./compute";
import { DEFAULT_WEIGHTS, validateWeights } from "./weights";
import { sendAssessmentCompleteEmail } from "@/lib/email/send";
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

// ── Server Actions ────────────────────────────────────────────

/**
 * Compute (or recompute) blueprint results for a completed session.
 *
 * - Auth check: must be the session owner.
 * - Only computes if session status is "completed".
 * - Upserts into blueprint_results (one row per session_id via UNIQUE).
 * - Non-fatally audit-logs the computation.
 */
export async function computeResults(
  sessionId: string,
  weights?: WeightConfig,
): Promise<{ success: boolean; results?: BlueprintResults; error?: string }> {
  const auth = await requireUserId();
  if (!auth.success) return auth;

  const { supabase, userId } = auth;

  // Verify session ownership and status
  const { data: session, error: sessionError } = await supabase
    .from("assessment_sessions")
    .select("id, user_id, status")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    return { success: false, error: "Session not found." };
  }
  if (session.user_id !== userId) {
    return { success: false, error: "Not authorized to compute results for this session." };
  }
  if (session.status !== "completed") {
    return { success: false, error: "Session must be completed before computing results." };
  }

  // Validate weights if provided
  if (weights && !validateWeights(weights)) {
    return { success: false, error: "Invalid weight configuration." };
  }

  // Fetch all answers for this session
  const { data: answers, error: answersError } = await supabase
    .from("assessment_answers")
    .select("id, session_id, question_id, category, answer, created_at, updated_at")
    .eq("session_id", sessionId);

  if (answersError) {
    console.error("Error fetching answers:", answersError);
    return { success: false, error: "Failed to fetch answers." };
  }

  if (!answers || answers.length === 0) {
    return { success: false, error: "No answers found for this session." };
  }

  // Compute results
  const effectiveWeights = weights ?? DEFAULT_WEIGHTS;
  const results = computeBlueprintResults(
    answers as AssessmentAnswer[],
    effectiveWeights,
    userId,
    sessionId,
  );

  // Persist to blueprint_results (upsert on session_id)
  const { error: upsertError } = await supabase
    .from("blueprint_results")
    .upsert(
      {
        session_id: sessionId,
        user_id: userId,
        category_results: results.categoryResults,
        overall_score: results.overallScore,
        overall_confidence: results.overallConfidence,
        weight_config: effectiveWeights,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id" },
    );

  if (upsertError) {
    console.error("Error persisting blueprint results:", upsertError);
    return { success: false, error: "Failed to store results." };
  }

  // Audit log (non-fatal)
  await auditLog(supabase, userId, "scoring.compute", "blueprint_results", sessionId, {
    overall_score: results.overallScore,
    overall_confidence: results.overallConfidence,
    categories_computed: results.categoryResults.length,
  });

  const { data: authUser } = await supabase.auth.getUser();
  const email = authUser.user?.email;
  const name = String(authUser.user?.user_metadata?.full_name ?? email?.split("@")[0] ?? "there");
  if (email) void sendAssessmentCompleteEmail(email, name, results.overallScore);
  await createNotification(
    userId,
    "assessment_complete",
    "Your Blueprint is complete",
    "Your Compatibility Blueprint results are ready to explore.",
    { session_id: sessionId, href: "/dashboard/scores" },
  );

  return { success: true, results };
}

/**
 * Retrieve blueprint results for a session.
 *
 * - Ownership check via join on assessment_sessions.
 * - If not found but the session is completed, auto-computes and returns.
 */
export async function getResults(
  sessionId: string,
): Promise<{ success: boolean; results?: BlueprintResults; error?: string }> {
  const auth = await requireUserId();
  if (!auth.success) return auth;

  const { supabase, userId } = auth;

  // Fetch existing results with ownership check
  const { data: row, error: fetchError } = await supabase
    .from("blueprint_results")
    .select("session_id, user_id, category_results, overall_score, overall_confidence, created_at, updated_at")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) {
    console.error("Error fetching blueprint results:", fetchError);
    return { success: false, error: "Failed to fetch results." };
  }

  if (row) {
    const results: BlueprintResults = {
      sessionId: row.session_id,
      userId: row.user_id,
      categoryResults: row.category_results,
      overallScore: row.overall_score,
      overallConfidence: row.overall_confidence,
      completedAt: row.updated_at ?? row.created_at,
    };
    return { success: true, results };
  }

  // No results found — check if session is completed and auto-compute
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
  if (session.status === "completed") {
    // Auto-compute
    return computeResults(sessionId);
  }

  return { success: false, error: "Results not available. Complete the assessment first." };
}
