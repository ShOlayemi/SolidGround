// ──────────────────────────────────────────────────────────────
// SolidGround AI — Category Weights
// ──────────────────────────────────────────────────────────────
// Weights control how much each category contributes to the
// overall compatibility score. Higher = more influential.
// ──────────────────────────────────────────────────────────────

import type { WeightConfig } from "./types";

export const DEFAULT_WEIGHTS: WeightConfig = {
  core_values: 1.25,
  communication: 1.25,
  lifestyle: 1.0,
  money: 1.1,
  career: 0.9,
  family: 1.1,
  children: 1.0,
  conflict_resolution: 1.2,
  health_wellness: 0.9,
  personal_growth: 1.0,
  social_life: 0.85,
  long_term_vision: 1.0,
};

/** Valid category IDs that must be present in any weight config. */
const VALID_CATEGORY_IDS = new Set(Object.keys(DEFAULT_WEIGHTS));

/**
 * Validate a weight config object.
 * Returns true if all required categories are present and all weights are positive numbers.
 */
export function validateWeights(weights: WeightConfig): boolean {
  if (!weights || typeof weights !== "object") return false;

  for (const catId of VALID_CATEGORY_IDS) {
    const w = weights[catId];
    if (typeof w !== "number" || w <= 0 || !Number.isFinite(w)) {
      return false;
    }
  }

  // No extra keys allowed
  for (const key of Object.keys(weights)) {
    if (!VALID_CATEGORY_IDS.has(key)) return false;
  }

  return true;
}

/**
 * Normalize weights so they sum to the number of categories (12.0),
 * keeping relative proportions intact.
 */
export function normalizeWeights(weights: WeightConfig): WeightConfig {
  const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
  if (total === 0) return { ...DEFAULT_WEIGHTS };

  const normalized: WeightConfig = {};
  for (const [key, value] of Object.entries(weights)) {
    normalized[key] = (value / total) * VALID_CATEGORY_IDS.size;
  }
  return normalized;
}
