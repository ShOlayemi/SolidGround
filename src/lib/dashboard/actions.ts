"use server";

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile/actions";
import { QUESTIONS, CATEGORY_ORDER, CATEGORY_LABELS } from "@/lib/assessment/questions";
import type {
  DashboardData,
  AuditEntry,
  AssessmentSession,
  AssessmentProgress,
  CategoryProgress,
  BlueprintStatus,
} from "@/types";
import type { BlueprintResults, BlueprintResultRow, CategoryResult } from "@/lib/scoring/types";

export async function getDashboardData(): Promise<DashboardData> {
  const profile = await getProfile();

  // ── Audit entries ──────────────────────────────────────────────
  let auditEntries: AuditEntry[] = [];
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, user_id, action, resource, resource_id, details, created_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        console.warn("audit_logs query error (table may not exist):", error.message);
      } else if (data) {
        auditEntries = data as AuditEntry[];
      }
    }
  } catch (err) {
    console.warn("audit_logs fetch failed:", err);
  }

  // ── Default empty values ───────────────────────────────────────
  let activeSession: AssessmentSession | null = null;
  let completedSession: AssessmentSession | null = null;
  let assessmentProgress: AssessmentProgress | null = null;
  let latestResults: BlueprintResults | null = null;
  let blueprintStatus: BlueprintStatus = "not_started";

  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      const userId = session.user.id;

      // Get the most recent assessment_session (any status)
      const { data: recentSession, error: sessionError } = await supabase
        .from("assessment_sessions")
        .select("id, user_id, status, mode, created_at, updated_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessionError) {
        console.warn("assessment_sessions query error:", sessionError.message);
      } else if (recentSession) {
        const sess = recentSession as AssessmentSession;

        if (sess.status === "completed") {
          blueprintStatus = "complete";
          completedSession = sess;
        } else if (sess.status === "in_progress" || sess.status === "not_started") {
          blueprintStatus = "in_progress";
          activeSession = sess;
        }

        // Completed sessions represent a fully answered Blueprint.
        if (sess.status === "completed") {
          assessmentProgress = {
            session: sess,
            categories: CATEGORY_ORDER.map((cat) => {
              const total = QUESTIONS.filter((q) => q.category === cat).length;
              return {
                category: cat,
                label: CATEGORY_LABELS[cat],
                total,
                answered: total,
                complete: true,
              };
            }),
            totalQuestions: QUESTIONS.length,
            totalAnswered: QUESTIONS.length,
            percentage: 100,
          };
        }

        // Compute assessment progress for active sessions
        if (sess.status === "in_progress" || sess.status === "not_started") {
          const { data: answers, error: answersError } = await supabase
            .from("assessment_answers")
            .select("question_id, category")
            .eq("session_id", sess.id);

          if (answersError) {
            console.warn("assessment_answers query error:", answersError.message);
          }

          const answeredIds = new Set((answers ?? []).map((a: { question_id: string }) => a.question_id));
          const totalQuestions = QUESTIONS.length;
          const totalAnswered = answeredIds.size;
          const percentage = totalQuestions > 0 ? Math.round((totalAnswered / totalQuestions) * 100) : 0;

          // Build category progress
          const categories: CategoryProgress[] = CATEGORY_ORDER.map((cat) => {
            const total = QUESTIONS.filter((q) => q.category === cat).length;
            const answered = (answers ?? []).filter(
              (a: { category: string }) => a.category === cat,
            ).length;
            return {
              category: cat,
              label: CATEGORY_LABELS[cat],
              total,
              answered,
              complete: answered >= total,
            };
          });

          assessmentProgress = {
            session: sess,
            categories,
            totalQuestions,
            totalAnswered,
            percentage,
          };
        }

        // Fetch blueprint_results for completed sessions
        if (sess.status === "completed") {
          const { data: resultRow, error: resultsError } = await supabase
            .from("blueprint_results")
            .select("session_id, user_id, category_results, overall_score, overall_confidence, created_at, updated_at")
            .eq("session_id", sess.id)
            .eq("user_id", userId)
            .maybeSingle();

          if (resultsError) {
            console.warn("blueprint_results query error:", resultsError.message);
          } else if (resultRow) {
            const row = resultRow as BlueprintResultRow;
            latestResults = {
              sessionId: row.session_id,
              userId: row.user_id,
              categoryResults: row.category_results as CategoryResult[],
              overallScore: row.overall_score,
              overallConfidence: row.overall_confidence,
              completedAt: row.updated_at ?? row.created_at,
            };
          }
        }
      }
    }
  } catch (err) {
    console.warn("assessment data fetch failed:", err);
  }

  return {
    profile,
    auditEntries,
    blueprintStatus,
    activeSession,
    completedSession,
    assessmentProgress,
    latestResults,
  };
}

