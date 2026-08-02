// ──────────────────────────────────────────────────────────────
// SolidGround AI — Blueprint Fixture Builders
// ──────────────────────────────────────────────────────────────
// Shared helpers for unit + integration tests: build valid
// BlueprintResults objects from a per-category score map.
// ──────────────────────────────────────────────────────────────
import type {
  BlueprintResults,
  CategoryResult,
} from "@/lib/scoring/types";
import type { AssessmentCategory } from "@/types";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/assessment/questions";

export function makeCategoryResult(
  category: AssessmentCategory,
  score: number,
  overrides: Partial<CategoryResult> = {},
): CategoryResult {
  return {
    category,
    label: CATEGORY_LABELS[category] ?? category,
    score,
    confidence: 90,
    strengths: [],
    growthAreas: [],
    dealBreakerTriggered: false,
    questionScores: {},
    ...overrides,
  };
}

/**
 * Build a full 12-category BlueprintResults.
 * scores: categoryId → 0..100. Missing categories default to 50.
 */
export function makeBlueprintResults(
  userId: string,
  sessionId: string,
  scores: Partial<Record<AssessmentCategory, number>> = {},
  overrides: Partial<BlueprintResults> = {},
): BlueprintResults {
  const categoryResults: CategoryResult[] = CATEGORY_ORDER.map((cat) =>
    makeCategoryResult(cat, scores[cat] ?? 50),
  );
  const overallScore = Math.round(
    categoryResults.reduce((sum, c) => sum + c.score, 0) / categoryResults.length,
  );
  return {
    sessionId,
    userId,
    categoryResults,
    overallScore,
    overallConfidence: 90,
    completedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

/** Make a BlueprintResults with a deal-breaker flagged in a category. */
export function makeBlueprintWithDealBreaker(
  userId: string,
  sessionId: string,
  category: AssessmentCategory,
  score = 30,
): BlueprintResults {
  const results = makeBlueprintResults(userId, sessionId, { [category]: score });
  const target = results.categoryResults.find((c) => c.category === category);
  if (target) {
    target.dealBreakerTriggered = true;
    target.score = score;
  }
  return results;
}

/** All 12 category IDs. */
export { CATEGORY_ORDER };
