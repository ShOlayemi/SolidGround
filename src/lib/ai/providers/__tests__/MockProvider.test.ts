// ──────────────────────────────────────────────────────────────
// SolidGround AI — MockProvider Unit Tests
// ──────────────────────────────────────────────────────────────
// Verifies the Mock AI provider produces realistic, deterministic,
// data-grounded insights with correct score-tier behavior.
// ──────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { MockProvider } from "../MockProvider";
import type { AIInsights } from "@/types";
import type { BlueprintResults, CategoryResult } from "@/lib/scoring/types";

const CATEGORIES: ReadonlyArray<readonly [string, string]> = [
  ["core_values", "Core Values"],
  ["communication", "Communication"],
  ["lifestyle", "Lifestyle"],
  ["money", "Money & Finances"],
  ["career", "Career & Ambition"],
  ["family", "Family"],
  ["children", "Children & Parenting"],
  ["conflict_resolution", "Conflict Resolution"],
  ["health_wellness", "Health & Wellness"],
  ["personal_growth", "Personal Growth"],
  ["social_life", "Social Life"],
  ["long_term_vision", "Long-Term Vision"],
];

function makeCategory(category: string, label: string, score: number): CategoryResult {
  return {
    category,
    label,
    score,
    confidence: 80,
    strengths: [],
    growthAreas: [],
    dealBreakerTriggered: false,
    questionScores: {},
  };
}

/**
 * Build a BlueprintResults fixture with the 12 real categories.
 * `scores` is a 12-length array of category scores; the overall
 * score is passed explicitly. Pass `dealBreaker` to flag a
 * category as deal-breaker-triggered.
 */
function makeResults(
  overallScore: number,
  scores: number[],
  dealBreaker?: string,
): BlueprintResults {
  const categoryResults = CATEGORIES.map(([cat, label], i) => {
    const cr = makeCategory(cat, label, scores[i] ?? overallScore);
    if (dealBreaker && cat === dealBreaker) cr.dealBreakerTriggered = true;
    return cr;
  });
  return {
    sessionId: "session-alpha-1",
    userId: "user-1",
    categoryResults,
    overallScore,
    overallConfidence: 85,
    completedAt: "2026-08-01T00:00:00Z",
  };
}

// High tier: overall 85, strong across the board, communication high.
const HIGH_SCORES = [88, 84, 78, 82, 90, 86, 80, 75, 83, 87, 79, 85];
// Moderate tier: overall 55, mixed.
const MODERATE_SCORES = [60, 48, 55, 42, 63, 58, 50, 38, 61, 57, 52, 45];
// Developing tier: overall 30, low everywhere.
const DEVELOPING_SCORES = [32, 28, 35, 22, 30, 26, 31, 18, 33, 29, 27, 24];

const BANNED = /\b(lorem|ipsum|mock|dummy|placeholder|test)\b/i;

function allInsightText(insights: AIInsights): string {
  return JSON.stringify({
    blueprintSummary: insights.blueprintSummary,
    personalStrengths: insights.personalStrengths,
    growthOpportunities: insights.growthOpportunities,
    reflectionQuestions: insights.reflectionQuestions,
    communicationRecommendations: insights.communicationRecommendations,
    relationshipReadiness: insights.relationshipReadiness,
  });
}

describe("MockProvider", () => {
  it("populates all 6 insight sections with realistic content", async () => {
    const provider = new MockProvider();
    const insights = await provider.generateInsights(makeResults(55, MODERATE_SCORES));

    // blueprintSummary: 2–3 paragraphs of real prose
    expect(insights.blueprintSummary.length).toBeGreaterThan(200);
    expect(insights.blueprintSummary).toContain("55/100");
    // References the actual highest and lowest scoring categories
    expect(insights.blueprintSummary).toContain("Career & Ambition");
    expect(insights.blueprintSummary).toContain("Conflict Resolution");

    // personalStrengths: 3–5 entries
    expect(insights.personalStrengths.length).toBeGreaterThanOrEqual(3);
    expect(insights.personalStrengths.length).toBeLessThanOrEqual(5);

    // growthOpportunities: at least 2 entries
    expect(insights.growthOpportunities.length).toBeGreaterThanOrEqual(2);

    // reflectionQuestions: exactly 5
    expect(insights.reflectionQuestions.length).toBe(5);

    // communicationRecommendations: 3–4 entries
    expect(insights.communicationRecommendations.length).toBeGreaterThanOrEqual(3);
    expect(insights.communicationRecommendations.length).toBeLessThanOrEqual(4);

    // relationshipReadiness: complete and valid
    const rr = insights.relationshipReadiness;
    expect(["High", "Moderate", "Developing"]).toContain(rr.level);
    expect(rr.summary.length).toBeGreaterThan(50);
    expect(rr.strengths.length).toBeGreaterThanOrEqual(2);
    expect(rr.areas_to_develop.length).toBeGreaterThanOrEqual(2);

    // Scores are referenced in the content (data-grounded, not generic)
    expect(insights.personalStrengths[0]).toContain("/100");
    expect(insights.growthOpportunities[0]).toContain("/100");
  });

  it("produces no placeholder or mock text in any output", async () => {
    const provider = new MockProvider();
    for (const scores of [HIGH_SCORES, MODERATE_SCORES, DEVELOPING_SCORES]) {
      const overall = scores[0]; // representative per-tier fixture
      const insights = await provider.generateInsights(makeResults(overall, scores));
      const text = allInsightText(insights);
      expect(BANNED.test(text)).toBe(false);
      // Every array is non-empty and every string is substantive
      for (const key of [
        "blueprintSummary",
        "personalStrengths",
        "growthOpportunities",
        "reflectionQuestions",
        "communicationRecommendations",
      ] as const) {
        const value = insights[key];
        if (Array.isArray(value)) {
          expect(value.length).toBeGreaterThan(0);
          for (const item of value) expect(item.length).toBeGreaterThan(20);
        } else {
          expect(value.length).toBeGreaterThan(20);
        }
      }
    }
  });

  it("score tier logic produces different outputs for each tier", async () => {
    const provider = new MockProvider();
    const high = await provider.generateInsights(makeResults(85, HIGH_SCORES));
    const moderate = await provider.generateInsights(makeResults(55, MODERATE_SCORES));
    const developing = await provider.generateInsights(makeResults(30, DEVELOPING_SCORES));

    // Distinct summaries per tier
    const summaries = new Set([high.blueprintSummary, moderate.blueprintSummary, developing.blueprintSummary]);
    expect(summaries.size).toBe(3);

    // Distinct readiness levels
    expect(high.relationshipReadiness.level).toBe("High");
    expect(moderate.relationshipReadiness.level).toBe("Moderate");
    expect(developing.relationshipReadiness.level).toBe("Developing");
  });

  it("relationshipReadiness.level is correct for each tier and boundaries", async () => {
    const provider = new MockProvider();
    const cases: Array<[number, string]> = [
      [30, "Developing"],
      [44, "Developing"],
      [45, "Moderate"],
      [55, "Moderate"],
      [69, "Moderate"],
      [70, "High"],
      [85, "High"],
      [100, "High"],
    ];
    for (const [score, expected] of cases) {
      const insights = await provider.generateInsights(makeResults(score, MODERATE_SCORES));
      expect(insights.relationshipReadiness.level).toBe(expected);
    }
  });

  it("is deterministic — same input produces identical output", async () => {
    const provider = new MockProvider();
    const results = makeResults(55, MODERATE_SCORES);
    const first = await provider.generateInsights(results);
    const second = await provider.generateInsights(results);
    expect(second).toEqual(first);
  });

  it("references deal-breaker flags when triggered", async () => {
    const provider = new MockProvider();
    const insights = await provider.generateInsights(
      makeResults(55, MODERATE_SCORES, "money"),
    );
    expect(insights.blueprintSummary).toContain("Money & Finances");
    expect(insights.reflectionQuestions.some((q) => q.includes("deal-breaker"))).toBe(true);
    expect(insights.relationshipReadiness.areas_to_develop.some((a) => a.includes("deal-breaker"))).toBe(true);
  });

  it("handles empty category results gracefully", async () => {
    const provider = new MockProvider();
    const insights = await provider.generateInsights({
      sessionId: "session-alpha-1",
      userId: "user-1",
      categoryResults: [],
      overallScore: 0,
      overallConfidence: 0,
      completedAt: "2026-08-01T00:00:00Z",
    });
    expect(insights.blueprintSummary.length).toBeGreaterThan(50);
    expect(insights.personalStrengths.length).toBeGreaterThan(0);
    expect(["High", "Moderate", "Developing"]).toContain(insights.relationshipReadiness.level);
  });
});
