"use server";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { QUESTIONS, getQuestionById, CATEGORY_ORDER, CATEGORY_LABELS } from "./questions";
import type {
  AssessmentSession,
  AssessmentAnswer,
  AssessmentProgress,
  AssessmentActionResult,
  CategoryProgress,
  AssessmentCategory,
} from "@/types";

// ── Helpers ───────────────────────────────────────────────────

type AuthResult =
  | { success: true; userId: string; supabase: SupabaseClient }
  | { success: false; error: string };

/** Get the authenticated user ID or return an error. */
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

/** Write a non-fatal audit log entry. */
async function auditLog(
  supabase: SupabaseClient,
  userId: string,
  action: string,
  resource: string,
  resourceId: string,
  details: Record<string, unknown>,
) {
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

/** Validate an answer value against the expected question type. */
function validateAnswer(
  questionId: string,
  answer: unknown,
): { valid: true } | { valid: false; error: string } {
  const question = getQuestionById(questionId);
  if (!question) {
    return { valid: false, error: `Unknown question: ${questionId}` };
  }

  switch (question.type) {
    case "likert_5": {
      if (typeof answer !== "number" || !Number.isInteger(answer) || answer < 1 || answer > 5) {
        return { valid: false, error: "Likert answer must be an integer between 1 and 5." };
      }
      return { valid: true };
    }
    case "single_choice": {
      if (typeof answer !== "string" || answer.length === 0) {
        return { valid: false, error: "Single-choice answer must be a non-empty string." };
      }
      const validValues = question.options?.map((o) => o.value) ?? [];
      if (!validValues.includes(answer)) {
        return { valid: false, error: `Answer must be one of: ${validValues.join(", ")}` };
      }
      return { valid: true };
    }
    case "multi_choice": {
      if (!Array.isArray(answer) || !answer.every((a) => typeof a === "string")) {
        return { valid: false, error: "Multi-choice answer must be an array of strings." };
      }
      const validValues = question.options?.map((o) => o.value) ?? [];
      const invalid = (answer as string[]).filter((a) => !validValues.includes(a));
      if (invalid.length > 0) {
        return { valid: false, error: `Invalid choices: ${invalid.join(", ")}` };
      }
      return { valid: true };
    }
    case "text": {
      if (typeof answer !== "string") {
        return { valid: false, error: "Text answer must be a string." };
      }
      if ((answer as string).length > 2000) {
        return { valid: false, error: "Text answer must be 2000 characters or fewer." };
      }
      return { valid: true };
    }
    default:
      return { valid: false, error: `Unknown question type.` };
  }
}

// ── Server Actions ────────────────────────────────────────────

/**
 * Get or create an active assessment session for the current user.
 * Returns the existing in-progress/not-started session, or creates a new one
 * if only completed sessions exist.
 */
export async function getOrCreateSession(): Promise<{
  success: boolean;
  session?: AssessmentSession;
  error?: string;
}> {
  const auth = await requireUserId();
  if (!auth.success) return auth;

  const { supabase, userId } = auth;

  // Look for existing active session
  const { data: existing, error: fetchError } = await supabase
    .from("assessment_sessions")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["not_started", "in_progress"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    console.error("Error fetching assessment session:", fetchError);
    return { success: false, error: "Failed to fetch assessment session." };
  }

  if (existing) {
    return { success: true, session: existing as AssessmentSession };
  }

  // No active session — create one
  const { data: created, error: createError } = await supabase
    .from("assessment_sessions")
    .insert({
      user_id: userId,
      status: "in_progress",
      current_dimension: CATEGORY_ORDER[0],
      current_question_index: 0,
      total_questions_answered: 0,
      started_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (createError) {
    console.error("Error creating assessment session:", createError);
    return { success: false, error: "Failed to create assessment session." };
  }

  await auditLog(supabase, userId, "assessment.session_create", "assessment_sessions", created.id, {});

  return { success: true, session: created as AssessmentSession };
}

/**
 * Save a single answer. Upserts on (session_id, question_id).
 * Updates the session's current_category and total_questions_answered.
 */
export async function saveAnswer(
  sessionId: string,
  questionId: string,
  category: AssessmentCategory,
  answer: unknown,
): Promise<AssessmentActionResult> {
  const auth = await requireUserId();
  if (!auth.success) return auth;

  const { supabase, userId } = auth;

  // Verify session ownership
  const { data: session, error: sessionError } = await supabase
    .from("assessment_sessions")
    .select("id, user_id, status")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    return { success: false, error: "Session not found." };
  }
  if (session.user_id !== userId) {
    return { success: false, error: "Not authorized to modify this session." };
  }
  if (session.status === "completed") {
    return { success: false, error: "Cannot modify a completed session." };
  }

  // Validate answer
  const validation = validateAnswer(questionId, answer);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // Save answer (upsert)
  const { error: upsertError } = await supabase
    .from("assessment_answers")
    .upsert(
      {
        session_id: sessionId,
        question_id: questionId,
        category,
        answer,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id,question_id" },
    );

  if (upsertError) {
    console.error("Error saving answer:", upsertError);
    return { success: false, error: "Failed to save answer." };
  }

  // Count total answered questions for this session
  const { count, error: countError } = await supabase
    .from("assessment_answers")
    .select("*", { count: "exact", head: true })
    .eq("session_id", sessionId);

  if (countError) {
    console.error("Error counting answers:", countError);
  }

  // Update session metadata
  const { error: updateError } = await supabase
    .from("assessment_sessions")
    .update({
      current_category: category,
      current_question_index: 0, // Reset sub-index; UI tracks per-category position
      total_questions_answered: count ?? 0,
      status: "in_progress",
    })
    .eq("id", sessionId);

  if (updateError) {
    console.error("Error updating session:", updateError);
    return { success: false, error: "Failed to update session progress." };
  }

  await auditLog(supabase, userId, "assessment.answer_save", "assessment_answers", sessionId, {
    question_id: questionId,
    category,
  });

  return { success: true };
}

/**
 * Get all answers for a session, scoped to the authenticated user.
 */
export async function getAnswers(sessionId: string): Promise<{
  success: boolean;
  answers?: AssessmentAnswer[];
  error?: string;
}> {
  const auth = await requireUserId();
  if (!auth.success) return auth;

  const { supabase, userId } = auth;

  // Verify ownership
  const { data: session, error: sessionError } = await supabase
    .from("assessment_sessions")
    .select("id, user_id")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    return { success: false, error: "Session not found." };
  }
  if (session.user_id !== userId) {
    return { success: false, error: "Not authorized." };
  }

  const { data, error } = await supabase
    .from("assessment_answers")
    .select("id, session_id, question_id, category, answer, created_at, updated_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching answers:", error);
    return { success: false, error: "Failed to fetch answers." };
  }

  return { success: true, answers: data as AssessmentAnswer[] };
}

/**
 * Get full assessment progress — session + answers + category breakdown.
 */
export async function getAssessmentProgress(): Promise<{
  success: boolean;
  progress?: AssessmentProgress;
  error?: string;
}> {
  const auth = await requireUserId();
  if (!auth.success) return auth;

  const { supabase, userId } = auth;

  // Get active session
  const { data: session, error: sessionError } = await supabase
    .from("assessment_sessions")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["not_started", "in_progress"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sessionError) {
    console.error("Error fetching session:", sessionError);
    return { success: false, error: "Failed to fetch session." };
  }

  if (!session) {
    // No active session — return empty progress
    const emptyCategories: CategoryProgress[] = CATEGORY_ORDER.map((cat) => ({
      category: cat,
      label: CATEGORY_LABELS[cat],
      total: QUESTIONS.filter((q) => q.category === cat).length,
      answered: 0,
      complete: false,
    }));
    return {
      success: true,
      progress: {
        session: {
          id: "",
          user_id: userId,
          status: "not_started",
          current_category: null,
          current_question_index: 0,
          total_questions_answered: 0,
          responses: null,
          started_at: null,
          completed_at: null,
          created_at: "",
          updated_at: "",
        },
        categories: emptyCategories,
        totalQuestions: QUESTIONS.length,
        totalAnswered: 0,
        percentage: 0,
      },
    };
  }

  // Get answers for this session
  const { data: answers, error: answersError } = await supabase
    .from("assessment_answers")
    .select("question_id, category")
    .eq("session_id", session.id);

  if (answersError) {
    console.error("Error fetching answers:", answersError);
    return { success: false, error: "Failed to fetch answers." };
  }

  const answeredIds = new Set((answers ?? []).map((a) => a.question_id));

  // Build category progress
  const categories: CategoryProgress[] = CATEGORY_ORDER.map((cat) => {
    const total = QUESTIONS.filter((q) => q.category === cat).length;
    const answered = (answers ?? []).filter((a) => a.category === cat).length;
    return {
      category: cat,
      label: CATEGORY_LABELS[cat],
      total,
      answered,
      complete: answered >= total,
    };
  });

  const totalAnswered = answeredIds.size;
  const percentage = QUESTIONS.length > 0 ? Math.round((totalAnswered / QUESTIONS.length) * 100) : 0;

  return {
    success: true,
    progress: {
      session: session as AssessmentSession,
      categories,
      totalQuestions: QUESTIONS.length,
      totalAnswered,
      percentage,
    },
  };
}

/**
 * Abandon all active (not_started / in_progress) sessions for the current user
 * and create a fresh session. Returns the new session ready for assessment.
 */
export async function resetSession(): Promise<{
  success: boolean;
  session?: AssessmentSession;
  error?: string;
}> {
  const auth = await requireUserId();
  if (!auth.success) return auth;

  const { supabase, userId } = auth;

  // Find all active sessions to abandon
  const { data: activeSessions, error: fetchError } = await supabase
    .from("assessment_sessions")
    .select("id")
    .eq("user_id", userId)
    .in("status", ["not_started", "in_progress"]);

  if (fetchError) {
    console.error("Error fetching active sessions:", fetchError);
    return { success: false, error: "Failed to fetch active sessions." };
  }

  const abandonedCount = (activeSessions ?? []).length;

  // Mark them all as abandoned
  if (activeSessions && activeSessions.length > 0) {
    const { error: abandonError } = await supabase
      .from("assessment_sessions")
      .update({
        status: "abandoned",
        completed_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .in("status", ["not_started", "in_progress"]);

    if (abandonError) {
      console.error("Error abandoning sessions:", abandonError);
      return { success: false, error: "Failed to abandon existing sessions." };
    }
  }

  // Create a fresh session — same logic as getOrCreateSession
  const { data: created, error: createError } = await supabase
    .from("assessment_sessions")
    .insert({
      user_id: userId,
      status: "in_progress",
      current_dimension: CATEGORY_ORDER[0],
      current_question_index: 0,
      total_questions_answered: 0,
      started_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (createError) {
    console.error("Error creating assessment session:", createError);
    return { success: false, error: "Failed to create new assessment session." };
  }

  await auditLog(supabase, userId, "assessment.session_reset", "assessment_sessions", created.id, {
    abandoned_count: abandonedCount,
  });

  return { success: true, session: created as AssessmentSession };
}

/**
 * Mark a session as completed. Snapshots all answers into the
 * responses JSONB column and sets completed_at.
 */
export async function completeSession(
  sessionId: string,
): Promise<AssessmentActionResult> {
  const auth = await requireUserId();
  if (!auth.success) return auth;

  const { supabase, userId } = auth;

  // Verify ownership
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
    return { success: false, error: "Session is already completed." };
  }

  // Fetch all answers
  const { data: answers, error: answersError } = await supabase
    .from("assessment_answers")
    .select("question_id, answer")
    .eq("session_id", sessionId);

  if (answersError) {
    console.error("Error fetching answers:", answersError);
    return { success: false, error: "Failed to fetch answers for snapshot." };
  }

  // Build responses snapshot
  const responses: Record<string, unknown> = {};
  for (const a of answers ?? []) {
    responses[a.question_id] = a.answer;
  }

  // Update session to completed with snapshot
  const { error: updateError } = await supabase
    .from("assessment_sessions")
    .update({
      status: "completed",
      responses,
      completed_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (updateError) {
    console.error("Error completing session:", updateError);
    return { success: false, error: "Failed to complete session." };
  }

  await auditLog(supabase, userId, "assessment.session_complete", "assessment_sessions", sessionId, {
    total_answers: Object.keys(responses).length,
  });

  return { success: true };
}
