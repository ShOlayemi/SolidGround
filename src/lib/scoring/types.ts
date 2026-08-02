// ──────────────────────────────────────────────────────────────
// SolidGround AI — Scoring Engine Types
// ──────────────────────────────────────────────────────────────

import type { AssessmentCategory } from "@/types";

export type ScoringDirection = "positive" | "negative";

/** Operator for deal-breaker threshold comparison. */
export type DealBreakerOperator = "gte" | "lte";

export interface QuestionScoringConfig {
  questionId: string;
  direction: ScoringDirection;
  isDealBreaker: boolean;
  /** Raw answer value that triggers the deal-breaker (for likert_5: 1–5). */
  dealBreakerThreshold?: number;
  /** How to compare answer to threshold. Default "gte". Use "lte" for lower-bound checks. */
  dealBreakerOperator?: DealBreakerOperator;
  /** For single_choice questions: option value → 0–100 score. */
  choiceScoreMap?: Record<string, number>;
}

export interface CategoryResult {
  category: string;
  label: string;
  score: number; // 0–100
  confidence: number; // 0–100
  strengths: string[]; // Question IDs where score >= 75
  growthAreas: string[]; // Question IDs where score <= 35
  dealBreakerTriggered: boolean;
  questionScores: Record<string, number>; // questionId → 0–100
}

export interface BlueprintResults {
  sessionId: string;
  userId: string;
  categoryResults: CategoryResult[];
  overallScore: number;
  overallConfidence: number;
  completedAt: string;
}

export interface WeightConfig {
  [categoryId: string]: number;
}

/** Row shape in the blueprint_results table. */
export interface BlueprintResultRow {
  id: string;
  session_id: string;
  user_id: string;
  category_results: CategoryResult[];
  overall_score: number;
  overall_confidence: number;
  weight_config: WeightConfig | null;
  created_at: string;
  updated_at: string;
}
