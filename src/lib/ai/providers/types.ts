// ──────────────────────────────────────────────────────────────
// SolidGround AI — AI Provider Interface
// ──────────────────────────────────────────────────────────────
// Defines the contract every AI insight provider must implement.
// Providers generate personalized insights from Blueprint results
// and never throw — they return fallback content on any failure.
// ──────────────────────────────────────────────────────────────

import type { BlueprintResults } from "@/lib/scoring/types";
import type { AIInsights } from "@/types";

export interface AIProvider {
  generateInsights(results: BlueprintResults): Promise<AIInsights>;
}
