// ──────────────────────────────────────────────────────────────
// SolidGround AI — Per-Question Scoring Metadata
// ──────────────────────────────────────────────────────────────
// One entry for every question in the assessment bank (88 total).
// Defaults: direction="positive", isDealBreaker=false.
// ──────────────────────────────────────────────────────────────

import type { QuestionScoringConfig } from "./types";

/** Shared score bands used by the UI and AI readiness summaries. */
export const SCORE_BANDS = [
  { min: 70, max: 100, label: "Strong", description: "Well-aligned and compatible." },
  { min: 45, max: 69, label: "Developing", description: "Some alignment, with areas to discuss." },
  { min: 0, max: 44, label: "Needs Attention", description: "Significant differences to explore." },
] as const;

export function getScoreBand(score: number) {
  return SCORE_BANDS.find((band) => score >= band.min && score <= band.max) ?? SCORE_BANDS[2];
}

export const SCORING_CONFIG: QuestionScoringConfig[] = [
  // ── Core Values (8) ───────────────────────────────────────
  {
    questionId: "core_values_01",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "core_values_02",
    direction: "positive",
    isDealBreaker: true,
    dealBreakerThreshold: 4, // triggers if agree/strongly agree
    dealBreakerOperator: "gte",
  },
  {
    questionId: "core_values_03",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "core_values_04",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "core_values_05",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "core_values_06",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "core_values_07",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "core_values_08",
    direction: "positive",
    isDealBreaker: false,
  },

  // ── Communication (8) ────────────────────────────────────
  {
    questionId: "communication_01",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "communication_02",
    direction: "negative", // "partner should intuit needs" — unrealistic expectation
    isDealBreaker: false,
  },
  {
    questionId: "communication_03",
    direction: "negative", // "immediately look for solutions" — poor listening
    isDealBreaker: false,
  },
  {
    questionId: "communication_04",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "communication_05",
    direction: "negative", // "shut down during arguments" — stonewalling
    isDealBreaker: false,
  },
  {
    questionId: "communication_06",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "communication_07",
    direction: "negative", // "texting frequency = interest indicator" — anxious attachment
    isDealBreaker: false,
  },
  {
    questionId: "communication_08",
    direction: "positive",
    isDealBreaker: false,
  },

  // ── Lifestyle (8) ────────────────────────────────────────
  {
    questionId: "lifestyle_01",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "lifestyle_02",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "lifestyle_03",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "lifestyle_04",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "lifestyle_05",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "lifestyle_06",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "lifestyle_07",
    direction: "negative", // "screen time is significant part of downtime" — digital dependency
    isDealBreaker: false,
  },
  {
    questionId: "lifestyle_08",
    direction: "positive",
    isDealBreaker: false,
  },

  // ── Money & Finances (8) ─────────────────────────────────
  {
    questionId: "money_01",
    direction: "positive",
    isDealBreaker: false,
    choiceScoreMap: {
      independent: 65,
      joint: 85,
      advisor: 75,
      research: 75,
    },
  },
  {
    questionId: "money_02",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "money_03",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "money_04",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "money_05",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "money_06",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "money_07",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "money_08",
    direction: "positive",
    isDealBreaker: false,
  },

  // ── Career & Ambition (8) ────────────────────────────────
  {
    questionId: "career_01",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "career_02",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "career_03",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "career_04",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "career_05",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "career_06",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "career_07",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "career_08",
    direction: "negative", // "work stress follows me home" — poor work-life boundary
    isDealBreaker: false,
  },

  // ── Family (8) ───────────────────────────────────────────
  {
    questionId: "family_01",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "family_02",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "family_03",
    direction: "negative", // "uncomfortable with dependent partner-parent relationship" — controlling
    isDealBreaker: false,
  },
  {
    questionId: "family_04",
    direction: "negative", // "family of origin always comes first" — unhealthy prioritization
    isDealBreaker: true,
    dealBreakerThreshold: 4, // triggers if agree/strongly agree
    dealBreakerOperator: "gte",
  },
  {
    questionId: "family_05",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "family_06",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "family_07",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "family_08",
    direction: "positive",
    isDealBreaker: false,
  },

  // ── Children & Parenting (7) ─────────────────────────────
  {
    questionId: "children_01",
    direction: "positive",
    isDealBreaker: true,
    dealBreakerThreshold: 1, // triggers if strongly disagree
    dealBreakerOperator: "lte",
  },
  {
    questionId: "children_02",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "children_03",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "children_04",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "children_05",
    direction: "positive",
    isDealBreaker: false,
    choiceScoreMap: {
      none: 60,
      one: 75,
      two: 80,
      three_plus: 70,
      undecided: 65,
    },
  },
  {
    questionId: "children_06",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "children_07",
    direction: "positive",
    isDealBreaker: false,
  },

  // ── Conflict Resolution (7) ──────────────────────────────
  {
    questionId: "conflict_resolution_01",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "conflict_resolution_02",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "conflict_resolution_03",
    direction: "negative", // "say things I later regret" — toxic communication
    isDealBreaker: false,
  },
  {
    questionId: "conflict_resolution_04",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "conflict_resolution_05",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "conflict_resolution_06",
    direction: "negative", // "hold grudges" — unhealthy
    isDealBreaker: false,
  },
  {
    questionId: "conflict_resolution_07",
    direction: "positive",
    isDealBreaker: false,
  },

  // ── Health & Wellness (7) ────────────────────────────────
  {
    questionId: "health_wellness_01",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "health_wellness_02",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "health_wellness_03",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "health_wellness_04",
    direction: "negative", // "use alcohol several times/week" — potential concern
    isDealBreaker: false,
  },
  {
    questionId: "health_wellness_05",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "health_wellness_06",
    direction: "positive",
    isDealBreaker: false,
    choiceScoreMap: {
      proactive: 85,
      basics: 60,
      moderate: 75,
      not_focus: 40,
    },
  },
  {
    questionId: "health_wellness_07",
    direction: "positive",
    isDealBreaker: false,
  },

  // ── Personal Growth (6) ──────────────────────────────────
  {
    questionId: "personal_growth_01",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "personal_growth_02",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "personal_growth_03",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "personal_growth_04",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "personal_growth_05",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "personal_growth_06",
    direction: "positive",
    isDealBreaker: false,
  },

  // ── Social Life (6) ──────────────────────────────────────
  {
    questionId: "social_life_01",
    direction: "negative", // "partner = primary companion for most activities" — codependency
    isDealBreaker: false,
  },
  {
    questionId: "social_life_02",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "social_life_03",
    direction: "negative", // "uncomfortable with partner's opposite-gender friends" — jealousy
    isDealBreaker: false,
  },
  {
    questionId: "social_life_04",
    direction: "positive",
    isDealBreaker: false,
    choiceScoreMap: {
      quiet: 70,
      balanced: 80,
      active: 75,
      adventuring: 75,
    },
  },
  {
    questionId: "social_life_05",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "social_life_06",
    direction: "positive",
    isDealBreaker: false,
  },

  // ── Long-Term Vision (7) ─────────────────────────────────
  {
    questionId: "long_term_vision_01",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "long_term_vision_02",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "long_term_vision_03",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "long_term_vision_04",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "long_term_vision_05",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "long_term_vision_06",
    direction: "positive",
    isDealBreaker: false,
  },
  {
    questionId: "long_term_vision_07",
    direction: "positive",
    isDealBreaker: false,
  },
];

// ── Validation ────────────────────────────────────────────────

const CONFIG_IDS = new Set(SCORING_CONFIG.map((c) => c.questionId));
if (CONFIG_IDS.size !== SCORING_CONFIG.length) {
  throw new Error("Duplicate question IDs in SCORING_CONFIG.");
}

/** Lookup map for O(1) access. */
const CONFIG_BY_ID = new Map<string, QuestionScoringConfig>();
for (const c of SCORING_CONFIG) {
  CONFIG_BY_ID.set(c.questionId, c);
}

export function getScoringConfig(questionId: string): QuestionScoringConfig | undefined {
  return CONFIG_BY_ID.get(questionId);
}
