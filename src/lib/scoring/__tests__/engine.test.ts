// ──────────────────────────────────────────────────────────────
// SolidGround AI — Scoring Engine Unit Tests
// ──────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import type { AssessmentCategory, AssessmentQuestion } from "@/types";
import type { QuestionScoringConfig, WeightConfig } from "../types";
import {
  scoreQuestion,
  scoreCategory,
  computeAllResults,
  DEAL_BREAKER_CAP,
} from "../engine";
import { CATEGORY_LABELS } from "@/lib/assessment/questions";

// ── Helpers ───────────────────────────────────────────────────

function makeLikertConfig(
  overrides: Partial<QuestionScoringConfig> = {},
): QuestionScoringConfig {
  return {
    questionId: "test_q",
    direction: "positive",
    isDealBreaker: false,
    ...overrides,
  };
}

function makeChoiceConfig(
  choiceScoreMap: Record<string, number>,
  overrides: Partial<QuestionScoringConfig> = {},
): QuestionScoringConfig {
  return {
    questionId: "test_q",
    direction: "positive",
    isDealBreaker: false,
    choiceScoreMap,
    ...overrides,
  };
}

// ── scoreQuestion: likert_5 positive ──────────────────────────

describe("scoreQuestion — likert_5 positive", () => {
  const config = makeLikertConfig({ direction: "positive" });

  it("maps 1 → 0", () => {
    expect(scoreQuestion(config, 1)).toBe(0);
  });

  it("maps 2 → 25", () => {
    expect(scoreQuestion(config, 2)).toBe(25);
  });

  it("maps 3 → 50", () => {
    expect(scoreQuestion(config, 3)).toBe(50);
  });

  it("maps 4 → 75", () => {
    expect(scoreQuestion(config, 4)).toBe(75);
  });

  it("maps 5 → 100", () => {
    expect(scoreQuestion(config, 5)).toBe(100);
  });
});

// ── scoreQuestion: likert_5 negative ──────────────────────────

describe("scoreQuestion — likert_5 negative", () => {
  const config = makeLikertConfig({ direction: "negative" });

  it("maps 1 → 100", () => {
    expect(scoreQuestion(config, 1)).toBe(100);
  });

  it("maps 2 → 75", () => {
    expect(scoreQuestion(config, 2)).toBe(75);
  });

  it("maps 3 → 50", () => {
    expect(scoreQuestion(config, 3)).toBe(50);
  });

  it("maps 4 → 25", () => {
    expect(scoreQuestion(config, 4)).toBe(25);
  });

  it("maps 5 → 0", () => {
    expect(scoreQuestion(config, 5)).toBe(0);
  });
});

// ── scoreQuestion: single_choice ──────────────────────────────

describe("scoreQuestion — single_choice", () => {
  const config = makeChoiceConfig({
    option_a: 85,
    option_b: 40,
  });

  it("looks up mapped value", () => {
    expect(scoreQuestion(config, "option_a")).toBe(85);
  });

  it("looks up another mapped value", () => {
    expect(scoreQuestion(config, "option_b")).toBe(40);
  });

  it("defaults unmapped value to 50", () => {
    expect(scoreQuestion(config, "unknown_option")).toBe(50);
  });
});

// ── scoreQuestion: edge cases ─────────────────────────────────

describe("scoreQuestion — edge cases", () => {
  it("invalid likert value (0) → 0", () => {
    const config = makeLikertConfig({ direction: "positive" });
    expect(scoreQuestion(config, 0)).toBe(0);
  });

  it("invalid likert value (6) → 0", () => {
    const config = makeLikertConfig({ direction: "positive" });
    expect(scoreQuestion(config, 6)).toBe(0);
  });

  it("non-numeric answer without choice map → 50", () => {
    const config = makeLikertConfig();
    expect(scoreQuestion(config, "some string")).toBe(50);
  });

  it("float value → 0 (invalid)", () => {
    const config = makeLikertConfig({ direction: "positive" });
    expect(scoreQuestion(config, 3.5)).toBe(0);
  });
});

// ── scoreCategory: basic scoring ──────────────────────────────

describe("scoreCategory — basic scoring", () => {
  const category: AssessmentCategory = "core_values";
  const questions: AssessmentQuestion[] = [
    { id: "cv_01", category: "core_values", text: "Q1", type: "likert_5" },
    { id: "cv_02", category: "core_values", text: "Q2", type: "likert_5" },
    { id: "cv_03", category: "core_values", text: "Q3", type: "likert_5" },
    { id: "cv_04", category: "core_values", text: "Q4", type: "likert_5" },
  ];

  const configs = new Map<string, QuestionScoringConfig>([
    ["cv_01", makeLikertConfig({ questionId: "cv_01", direction: "positive" })],
    ["cv_02", makeLikertConfig({ questionId: "cv_02", direction: "positive" })],
    ["cv_03", makeLikertConfig({ questionId: "cv_03", direction: "positive" })],
    ["cv_04", makeLikertConfig({ questionId: "cv_04", direction: "positive" })],
  ]);

  it("averages scores correctly (all 3s → 50)", () => {
    const answers = new Map([
      ["cv_01", 3],
      ["cv_02", 3],
      ["cv_03", 3],
      ["cv_04", 3],
    ]);
    const result = scoreCategory(category, questions, answers, configs);
    expect(result.score).toBe(50);
    expect(result.dealBreakerTriggered).toBe(false);
  });

  it("computes strengths (≥75) and growth areas (≤35)", () => {
    const answers = new Map([
      ["cv_01", 4], // 75
      ["cv_02", 5], // 100
      ["cv_03", 1], // 0
      ["cv_04", 2], // 25
    ]);
    const result = scoreCategory(category, questions, answers, configs);
    expect(result.strengths).toContain("cv_01");
    expect(result.strengths).toContain("cv_02");
    expect(result.growthAreas).toContain("cv_03");
    expect(result.growthAreas).toContain("cv_04");
    // Score = (75+100+0+25)/4 = 50
    expect(result.score).toBe(50);
    expect(result.dealBreakerTriggered).toBe(false);
  });

  it("handles missing answers (default 50)", () => {
    const answers = new Map([
      ["cv_01", 4],
    ]);
    const result = scoreCategory(category, questions, answers, configs);
    // (75 + 50 + 50 + 50) / 4 = 56.25 → 56
    expect(result.score).toBe(56);
  });
});

// ── scoreCategory: deal-breakers ──────────────────────────────

describe("scoreCategory — deal-breakers", () => {
  const category: AssessmentCategory = "family";
  const questions: AssessmentQuestion[] = [
    { id: "f_01", category: "family", text: "Q1", type: "likert_5" },
    { id: "f_02", category: "family", text: "Q2", type: "likert_5" },
    { id: "f_03", category: "family", text: "Q3", type: "likert_5" },
  ];

  it("caps score at DEAL_BREAKER_CAP when triggered (gte operator)", () => {
    const configs = new Map<string, QuestionScoringConfig>([
      ["f_01", makeLikertConfig({ questionId: "f_01", direction: "positive" })],
      ["f_02", makeLikertConfig({ questionId: "f_02", direction: "positive" })],
      [
        "f_03",
        makeLikertConfig({
          questionId: "f_03",
          direction: "negative",
          isDealBreaker: true,
          dealBreakerThreshold: 4,
          dealBreakerOperator: "gte",
        }),
      ],
    ]);

    // All answers are "perfect" except f_03 triggers deal-breaker at 4
    const answers = new Map([
      ["f_01", 5], // 100
      ["f_02", 5], // 100
      ["f_03", 4], // triggers deal-breaker
    ]);
    const result = scoreCategory(category, questions, answers, configs);
    expect(result.dealBreakerTriggered).toBe(true);
    expect(result.score).toBe(DEAL_BREAKER_CAP);
  });

  it("does NOT cap when deal-breaker threshold not reached", () => {
    const configs = new Map<string, QuestionScoringConfig>([
      ["f_01", makeLikertConfig({ questionId: "f_01", direction: "positive" })],
      ["f_02", makeLikertConfig({ questionId: "f_02", direction: "positive" })],
      [
        "f_03",
        makeLikertConfig({
          questionId: "f_03",
          direction: "negative",
          isDealBreaker: true,
          dealBreakerThreshold: 4,
          dealBreakerOperator: "gte",
        }),
      ],
    ]);

    // f_03 at 3 does NOT trigger (threshold is 4 with gte)
    const answers = new Map([
      ["f_01", 5], // 100
      ["f_02", 5], // 100
      ["f_03", 3], // does NOT trigger
    ]);
    const result = scoreCategory(category, questions, answers, configs);
    expect(result.dealBreakerTriggered).toBe(false);
    // expected: f_03 at 3, negative direction = (5-3)*25 = 50
    // (100 + 100 + 50) / 3 = 83.33 → 83
    expect(result.score).toBe(83);
  });

  it("handles lte operator (children_01 pattern)", () => {
    const configs = new Map<string, QuestionScoringConfig>([
      ["f_01", makeLikertConfig({ questionId: "f_01", direction: "positive" })],
      ["f_02", makeLikertConfig({ questionId: "f_02", direction: "positive" })],
      [
        "f_03",
        makeLikertConfig({
          questionId: "f_03",
          direction: "positive",
          isDealBreaker: true,
          dealBreakerThreshold: 1,
          dealBreakerOperator: "lte",
        }),
      ],
    ]);

    // Answer 1 triggers lte deal-breaker
    const answers = new Map([
      ["f_01", 5],
      ["f_02", 5],
      ["f_03", 1], // triggers (1 <= 1)
    ]);
    const result = scoreCategory(category, questions, answers, configs);
    expect(result.dealBreakerTriggered).toBe(true);
    expect(result.score).toBe(DEAL_BREAKER_CAP);
  });

  it("does NOT trigger lte deal-breaker when answer > threshold", () => {
    const configs = new Map<string, QuestionScoringConfig>([
      ["f_01", makeLikertConfig({ questionId: "f_01", direction: "positive" })],
      ["f_02", makeLikertConfig({ questionId: "f_02", direction: "positive" })],
      [
        "f_03",
        makeLikertConfig({
          questionId: "f_03",
          direction: "positive",
          isDealBreaker: true,
          dealBreakerThreshold: 1,
          dealBreakerOperator: "lte",
        }),
      ],
    ]);

    const answers = new Map([
      ["f_01", 5],
      ["f_02", 5],
      ["f_03", 2], // does NOT trigger (2 > 1)
    ]);
    const result = scoreCategory(category, questions, answers, configs);
    expect(result.dealBreakerTriggered).toBe(false);
  });
});

// ── scoreCategory: empty category ─────────────────────────────

describe("scoreCategory — empty category", () => {
  it("returns 50 with no questions", () => {
    const category: AssessmentCategory = "core_values";
    const result = scoreCategory(category, [], new Map(), new Map());
    expect(result.score).toBe(50);
    expect(result.confidence).toBe(100);
    expect(result.strengths).toEqual([]);
    expect(result.growthAreas).toEqual([]);
    expect(result.dealBreakerTriggered).toBe(false);
  });
});

// ── scoreCategory: confidence ─────────────────────────────────

describe("scoreCategory — confidence", () => {
  const category: AssessmentCategory = "core_values";
  const questions: AssessmentQuestion[] = [
    { id: "q1", category: "core_values", text: "Q1", type: "likert_5" },
    { id: "q2", category: "core_values", text: "Q2", type: "likert_5" },
    { id: "q3", category: "core_values", text: "Q3", type: "likert_5" },
  ];

  const configs = new Map<string, QuestionScoringConfig>([
    ["q1", makeLikertConfig({ questionId: "q1" })],
    ["q2", makeLikertConfig({ questionId: "q2" })],
    ["q3", makeLikertConfig({ questionId: "q3" })],
  ]);

  it("high confidence when answers are consistent", () => {
    const answers = new Map([
      ["q1", 3], // 50
      ["q2", 3], // 50
      ["q3", 3], // 50
    ]);
    const result = scoreCategory(category, questions, answers, configs);
    // stdDev = 0, confidence = 100 - 0*10 = 100
    expect(result.confidence).toBe(100);
  });

  it("lower confidence when answers vary widely", () => {
    const answers = new Map([
      ["q1", 1], // 0
      ["q2", 3], // 50
      ["q3", 5], // 100
    ]);
    const result = scoreCategory(category, questions, answers, configs);
    // stdDev ≈ 50, confidence ≈ 100 - 50*10 = -400 → clamped to 0
    // Actually let me compute: scores are [0, 50, 100], mean = 50
    // variance = ((0-50)^2 + (50-50)^2 + (100-50)^2) / 3 = (2500 + 0 + 2500) / 3 = 1666.67
    // stdDev ≈ 40.82, confidence = 100 - 408.2 = -308 → clamped to 0
    expect(result.confidence).toBeLessThan(100);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
  });
});

// ── computeAllResults: weighted average ──────────────────────

describe("computeAllResults — weighted average", () => {
  it("computes correct weighted overall score", () => {
    // We'll test with just 2 categories for simplicity
    const answers = new Map<string, unknown>([
      ["cv_1", 5], // 100
      ["cv_2", 5], // 100
      ["com_1", 1], // 0
      ["com_2", 1], // 0
    ]);

    const weights: WeightConfig = {
      core_values: 1.0,
      communication: 2.0, // communication counts twice as much
    };

    const questionsByCategory = new Map<AssessmentCategory, AssessmentQuestion[]>([
      [
        "core_values",
        [
          { id: "cv_1", category: "core_values", text: "CV1", type: "likert_5" },
          { id: "cv_2", category: "core_values", text: "CV2", type: "likert_5" },
        ],
      ],
      [
        "communication",
        [
          { id: "com_1", category: "communication", text: "C1", type: "likert_5" },
          { id: "com_2", category: "communication", text: "C2", type: "likert_5" },
        ],
      ],
    ]);

    const configs = new Map<string, QuestionScoringConfig>([
      ["cv_1", makeLikertConfig({ questionId: "cv_1" })],
      ["cv_2", makeLikertConfig({ questionId: "cv_2" })],
      ["com_1", makeLikertConfig({ questionId: "com_1" })],
      ["com_2", makeLikertConfig({ questionId: "com_2" })],
    ]);

    const results = computeAllResults(
      answers,
      weights,
      "user_1",
      "session_1",
      questionsByCategory,
      configs,
    );

    // Core values: both 100 → avg 100
    // Communication: both 0 → avg 0
    // Weighted: (100*1.0 + 0*2.0) / (1.0 + 2.0) = 100/3 = 33.33 → 33
    expect(results.overallScore).toBe(33);
    expect(results.categoryResults).toHaveLength(2);
  });
});

describe("computeAllResults — integration", () => {
  it("produces results for all 12 categories", () => {
    // Build minimal question set for all 12 categories
    const categories: AssessmentCategory[] = [
      "core_values",
      "communication",
      "lifestyle",
      "money",
      "career",
      "family",
      "children",
      "conflict_resolution",
      "health_wellness",
      "personal_growth",
      "social_life",
      "long_term_vision",
    ];

    const questionsByCategory = new Map<AssessmentCategory, AssessmentQuestion[]>();
    const answers = new Map<string, unknown>();
    const configs = new Map<string, QuestionScoringConfig>();

    for (const cat of categories) {
      const qId = `${cat}_t1`;
      questionsByCategory.set(cat, [
        { id: qId, category: cat, text: "Test Q", type: "likert_5" },
      ]);
      answers.set(qId, 3); // neutral
      configs.set(qId, makeLikertConfig({ questionId: qId }));
    }

    const weights: WeightConfig = Object.fromEntries(
      categories.map((c) => [c, 1.0]),
    ) as WeightConfig;

    const results = computeAllResults(
      answers,
      weights,
      "user_1",
      "session_1",
      questionsByCategory,
      configs,
    );

    expect(results.categoryResults).toHaveLength(12);
    // All neutral → overall should be 50
    expect(results.overallScore).toBe(50);
  });
});

// ── scoreCategory: answer-set edge cases ──────────────────────

describe("scoreCategory — answer-set edge cases", () => {
  const category: AssessmentCategory = "core_values";
  const questions: AssessmentQuestion[] = [
    { id: "q1", category: "core_values", text: "Q1", type: "likert_5" },
    { id: "q2", category: "core_values", text: "Q2", type: "likert_5" },
    { id: "q3", category: "core_values", text: "Q3", type: "likert_5" },
    { id: "q4", category: "core_values", text: "Q4", type: "likert_5" },
  ];
  const configs = new Map<string, QuestionScoringConfig>([
    ["q1", makeLikertConfig({ questionId: "q1" })],
    ["q2", makeLikertConfig({ questionId: "q2" })],
    ["q3", makeLikertConfig({ questionId: "q3" })],
    ["q4", makeLikertConfig({ questionId: "q4" })],
  ]);

  it("empty answers → every question defaults to 50", () => {
    const result = scoreCategory(category, questions, new Map(), configs);
    expect(result.score).toBe(50);
    expect(result.dealBreakerTriggered).toBe(false);
    // All four unanswered questions scored as neutral 50
    expect(Object.values(result.questionScores)).toEqual([50, 50, 50, 50]);
  });

  it("all answers 1 (positive) → score 0, all growth areas", () => {
    const answers = new Map([
      ["q1", 1],
      ["q2", 1],
      ["q3", 1],
      ["q4", 1],
    ]);
    const result = scoreCategory(category, questions, answers, configs);
    expect(result.score).toBe(0);
    expect(result.strengths).toEqual([]);
    expect(result.growthAreas).toEqual(["q1", "q2", "q3", "q4"]);
    expect(result.dealBreakerTriggered).toBe(false);
  });

  it("all answers 5 (positive) → score 100, all strengths", () => {
    const answers = new Map([
      ["q1", 5],
      ["q2", 5],
      ["q3", 5],
      ["q4", 5],
    ]);
    const result = scoreCategory(category, questions, answers, configs);
    expect(result.score).toBe(100);
    expect(result.strengths).toEqual(["q1", "q2", "q3", "q4"]);
    expect(result.growthAreas).toEqual([]);
    expect(result.dealBreakerTriggered).toBe(false);
  });

  it("mixed extreme answers → mid score with low confidence", () => {
    const answers = new Map([
      ["q1", 1], // 0
      ["q2", 1], // 0
      ["q3", 5], // 100
      ["q4", 5], // 100
    ]);
    const result = scoreCategory(category, questions, answers, configs);
    expect(result.score).toBe(50);
    // stdDev = 50 → confidence = 100 - 500 → clamped to 0
    expect(result.confidence).toBe(0);
  });
});

// ── computeAllResults: deal-breaker propagation ────────────────

describe("computeAllResults — deal-breaker propagation", () => {
  it("caps a category score and flags it when a deal-breaker triggers", () => {
    const answers = new Map<string, unknown>([
      ["cv_1", 5], // 100
      ["cv_2", 5], // 100
      ["fam_1", 5], // 100
      ["fam_2", 4], // triggers deal-breaker (negative, gte 4)
    ]);

    const weights: WeightConfig = { core_values: 1.0, family: 1.0 };

    const questionsByCategory = new Map<AssessmentCategory, AssessmentQuestion[]>([
      [
        "core_values",
        [
          { id: "cv_1", category: "core_values", text: "CV1", type: "likert_5" },
          { id: "cv_2", category: "core_values", text: "CV2", type: "likert_5" },
        ],
      ],
      [
        "family",
        [
          { id: "fam_1", category: "family", text: "F1", type: "likert_5" },
          { id: "fam_2", category: "family", text: "F2", type: "likert_5" },
        ],
      ],
    ]);

    const configs = new Map<string, QuestionScoringConfig>([
      ["cv_1", makeLikertConfig({ questionId: "cv_1" })],
      ["cv_2", makeLikertConfig({ questionId: "cv_2" })],
      ["fam_1", makeLikertConfig({ questionId: "fam_1" })],
      [
        "fam_2",
        makeLikertConfig({
          questionId: "fam_2",
          direction: "negative",
          isDealBreaker: true,
          dealBreakerThreshold: 4,
          dealBreakerOperator: "gte",
        }),
      ],
    ]);

    const results = computeAllResults(
      answers,
      weights,
      "user_1",
      "session_1",
      questionsByCategory,
      configs,
    );

    const family = results.categoryResults.find((c) => c.category === "family")!;
    const coreValues = results.categoryResults.find(
      (c) => c.category === "core_values",
    )!;

    expect(family.dealBreakerTriggered).toBe(true);
    expect(family.score).toBe(DEAL_BREAKER_CAP);
    expect(coreValues.dealBreakerTriggered).toBe(false);
    expect(coreValues.score).toBe(100);
    // Overall = (100*1.0 + 30*1.0) / 2 = 65
    expect(results.overallScore).toBe(65);
  });

  it("empty question map → overall score 50, zero confidence", () => {
    const results = computeAllResults(
      new Map(),
      {},
      "user_1",
      "session_1",
      new Map(),
      new Map(),
    );
    expect(results.categoryResults).toHaveLength(0);
    expect(results.overallScore).toBe(50);
    expect(results.overallConfidence).toBe(0);
  });
});
