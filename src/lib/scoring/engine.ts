// ──────────────────────────────────────────────────────────────
// SolidGround AI — Scoring Engine
// ──────────────────────────────────────────────────────────────
// Pure functions — no database access, no side effects, no AI.
// Fully deterministic: same input always produces same output.
// ──────────────────────────────────────────────────────────────

import type { AssessmentQuestion, AssessmentCategory } from "@/types";
import type {
  QuestionScoringConfig,
  CategoryResult,
  BlueprintResults,
  WeightConfig,
  DealBreakerOperator,
} from "./types";
import { CATEGORY_LABELS } from "@/lib/assessment/questions";

export const DEAL_BREAKER_CAP = 30;

// ── Helpers ───────────────────────────────────────────────────

/** Compute the standard deviation of an array of numbers. */
function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredDiffs = values.map((v) => (v - mean) ** 2);
  const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
  return Math.sqrt(variance);
}

/** Clamp a number to [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Check if a deal-breaker is triggered for a likert_5 answer.
 * Uses the configured operator and threshold.
 */
function isDealBreakerTriggered(
  config: QuestionScoringConfig,
  answer: number,
): boolean {
  if (!config.isDealBreaker || typeof config.dealBreakerThreshold !== "number") {
    return false;
  }
  const operator: DealBreakerOperator = config.dealBreakerOperator ?? "gte";
  if (operator === "lte") {
    return answer <= config.dealBreakerThreshold;
  }
  return answer >= config.dealBreakerThreshold;
}

// ── Public API ────────────────────────────────────────────────

/**
 * Score a single question answer.
 *
 * likert_5 positive: (answer - 1) * 25  →  1→0, 2→25, 3→50, 4→75, 5→100
 * likert_5 negative: (5 - answer) * 25  →  1→100, 5→0
 * single_choice:   lookup config.choiceScoreMap[answer], default 50
 */
export function scoreQuestion(config: QuestionScoringConfig, answer: unknown): number {
  // ── likert_5 ────────────────────────────────────────────
  if (typeof answer === "number") {
    if (!Number.isInteger(answer) || answer < 1 || answer > 5) {
      return 0; // invalid → floor at 0
    }
    if (config.direction === "negative") {
      return (5 - answer) * 25;
    }
    return (answer - 1) * 25;
  }

  // ── single_choice / multi_choice / text ────────────────
  if (typeof answer === "string") {
    const map = config.choiceScoreMap;
    if (map && answer in map) {
      return map[answer];
    }
    return 50; // default for unmapped choice answers
  }

  // ── Unsupported answer type ─────────────────────────────
  return 50;
}

/**
 * Score an entire category and return a CategoryResult.
 *
 * @param category     The category ID.
 * @param questions    All questions in this category (from the question bank).
 * @param answers      Map of questionId → raw answer value (from the DB).
 * @param configs      Scoring config keyed by questionId.
 */
export function scoreCategory(
  category: AssessmentCategory,
  questions: AssessmentQuestion[],
  answers: Map<string, unknown>,
  configs: Map<string, QuestionScoringConfig>,
): CategoryResult {
  const label = CATEGORY_LABELS[category];
  const questionScores: Record<string, number> = {};
  const scores: number[] = [];
  let dealBreakerTriggered = false;

  for (const q of questions) {
    const config = configs.get(q.id);
    const rawAnswer = answers.get(q.id);

    // Score the question (missing answer → 50, neutral)
    const score =
      config && rawAnswer !== undefined
        ? scoreQuestion(config, rawAnswer)
        : 50;

    questionScores[q.id] = score;
    scores.push(score);

    // Check deal-breaker (only for likert_5 with numeric answers)
    if (
      config &&
      config.isDealBreaker &&
      typeof rawAnswer === "number" &&
      isDealBreakerTriggered(config, rawAnswer)
    ) {
      dealBreakerTriggered = true;
    }
  }

  // If any deal-breaker triggered, cap the category score
  let categoryScore: number;
  if (dealBreakerTriggered) {
    categoryScore = DEAL_BREAKER_CAP;
  } else if (scores.length === 0) {
    categoryScore = 50;
  } else {
    const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    categoryScore = Math.round(clamp(avg, 0, 100));
  }

  // Confidence = 100 - (stdDev * 10), clamped [0, 100]
  const stdDev = standardDeviation(scores);
  const confidence = Math.round(clamp(100 - stdDev * 10, 0, 100));

  // Strengths: question IDs where score >= 75
  const strengths = Object.entries(questionScores)
    .filter(([, s]) => s >= 75)
    .map(([id]) => id);

  // Growth areas: question IDs where score <= 35
  const growthAreas = Object.entries(questionScores)
    .filter(([, s]) => s <= 35)
    .map(([id]) => id);

  return {
    category,
    label,
    score: categoryScore,
    confidence,
    strengths,
    growthAreas,
    dealBreakerTriggered,
    questionScores,
  };
}

/**
 * Compute all blueprint results from a full set of answers.
 *
 * @param answers  Map of questionId → raw answer value.
 * @param weights  Category weights for the overall score.
 * @param userId   The user who owns the session.
 * @param sessionId The assessment session ID.
 * @param questionsByCategory Pre-grouped questions for efficiency.
 * @param configs  Scoring config keyed by questionId.
 */
export function computeAllResults(
  answers: Map<string, unknown>,
  weights: WeightConfig,
  userId: string,
  sessionId: string,
  questionsByCategory: Map<AssessmentCategory, AssessmentQuestion[]>,
  configs: Map<string, QuestionScoringConfig>,
): BlueprintResults {
  const categoryResults: CategoryResult[] = [];

  let weightedSum = 0;
  let totalWeight = 0;
  let totalConfidence = 0;

  for (const [category, questions] of questionsByCategory) {
    const result = scoreCategory(category, questions, answers, configs);
    categoryResults.push(result);

    const weight = weights[category] ?? 1.0;
    weightedSum += result.score * weight;
    totalWeight += weight;
    totalConfidence += result.confidence;
  }

  const categoryCount = categoryResults.length;
  const overallScore =
    totalWeight > 0
      ? Math.round(weightedSum / totalWeight)
      : 50;
  const overallConfidence =
    categoryCount > 0
      ? Math.round(totalConfidence / categoryCount)
      : 0;

  return {
    sessionId,
    userId,
    categoryResults,
    overallScore: clamp(overallScore, 0, 100),
    overallConfidence: clamp(overallConfidence, 0, 100),
    completedAt: new Date().toISOString(),
  };
}
