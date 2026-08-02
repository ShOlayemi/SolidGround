// ──────────────────────────────────────────────────────────────
// SolidGround AI — Scoring Orchestrator
// ──────────────────────────────────────────────────────────────
// Ties together the question bank, scoring config, and engine.
// Pure data transformation — no database calls, no side effects.
// ──────────────────────────────────────────────────────────────

import type { AssessmentCategory, AssessmentAnswer, AssessmentQuestion } from "@/types";
import type { QuestionScoringConfig, BlueprintResults, WeightConfig } from "./types";
import { QUESTIONS, getQuestionsByCategory, CATEGORY_ORDER } from "@/lib/assessment/questions";
import { SCORING_CONFIG, getScoringConfig } from "./scoring-config";
import { computeAllResults } from "./engine";
import { DEFAULT_WEIGHTS } from "./weights";

// ── Pre-built lookup structures (built once at import) ────────

/** Questions grouped by category. */
const QUESTIONS_BY_CATEGORY = new Map<AssessmentCategory, AssessmentQuestion[]>();
for (const cat of CATEGORY_ORDER) {
  QUESTIONS_BY_CATEGORY.set(cat, getQuestionsByCategory(cat));
}

/** Scoring config keyed by questionId. */
const CONFIG_MAP = new Map<string, QuestionScoringConfig>();
for (const c of SCORING_CONFIG) {
  CONFIG_MAP.set(c.questionId, c);
}

// ── Orchestrator ──────────────────────────────────────────────

/**
 * Compute blueprint results from raw assessment answers.
 *
 * This is the main entry point. It transforms an array of
 * AssessmentAnswer rows into structured BlueprintResults.
 *
 * @param answers  Array of assessment answers (from DB).
 * @param weights  Optional custom weights (defaults apply).
 * @param userId   The owning user ID.
 * @param sessionId The session ID.
 */
export function computeBlueprintResults(
  answers: AssessmentAnswer[],
  weights?: WeightConfig,
  userId?: string,
  sessionId?: string,
): BlueprintResults {
  // Build answer map: questionId → raw answer
  const answerMap = new Map<string, unknown>();
  for (const a of answers) {
    answerMap.set(a.question_id, a.answer);
  }

  const effectiveWeights = weights ?? DEFAULT_WEIGHTS;
  const effectiveUserId = userId ?? "";
  const effectiveSessionId = sessionId ?? "";

  return computeAllResults(
    answerMap,
    effectiveWeights,
    effectiveUserId,
    effectiveSessionId,
    QUESTIONS_BY_CATEGORY,
    CONFIG_MAP,
  );
}

/**
 * Validate that a set of answers covers all required questions.
 * Returns the list of missing question IDs.
 */
export function getMissingQuestions(answeredIds: Set<string>): string[] {
  return QUESTIONS.filter((q) => !answeredIds.has(q.id)).map((q) => q.id);
}
