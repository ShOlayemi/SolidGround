"use server";
// ──────────────────────────────────────────────────────────────
// SolidGround AI — AI Insights Server Actions
// ──────────────────────────────────────────────────────────────
import type { AIInsights } from "@/types";
import { getOrGenerateInsights } from "./service";
import { checkAccess } from "@/lib/billing/middleware";
/**
 * Server action: fetch or generate AI insights for a session.
 *
 * Billing gate enforced via plan limits. Built-in caching — if
 * insights were already generated for this session, returns them
 * immediately without calling OpenAI.
 */
export async function getAIInsights(
  sessionId: string,
): Promise<{ success: boolean; insights?: AIInsights; error?: string; cached?: boolean }> {
  const access = await checkAccess("aiInsightCount");
  if (!access.allowed) {
    return { success: false, error: "Upgrade required." };
  }
  return getOrGenerateInsights(sessionId);
}
