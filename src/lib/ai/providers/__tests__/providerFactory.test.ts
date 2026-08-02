// ──────────────────────────────────────────────────────────────
// SolidGround AI — AI Provider Factory Unit Tests
// ──────────────────────────────────────────────────────────────
// Verifies the factory selects the right provider based on
// NEXT_PUBLIC_AI_MODE. The env var must be set BEFORE importing
// the factory (static imports are hoisted, so we use dynamic
// imports). Each test file runs in its own module graph.
// ──────────────────────────────────────────────────────────────

process.env.NEXT_PUBLIC_AI_MODE = "mock";

import { describe, it, expect } from "vitest";
import type { AIProvider } from "../types";

const { aiProvider } = await import("../../providerFactory");
const { MockProvider } = await import("../MockProvider");

describe("AI provider factory", () => {
  it("selects MockProvider when NEXT_PUBLIC_AI_MODE=mock", () => {
    expect(aiProvider).toBeInstanceOf(MockProvider);
  });

  it("exposes the AIProvider interface", async () => {
    const provider = aiProvider as AIProvider;
    expect(typeof provider.generateInsights).toBe("function");
    const insights = await provider.generateInsights({
      sessionId: "session-alpha-1",
      userId: "user-1",
      categoryResults: [],
      overallScore: 55,
      overallConfidence: 80,
      completedAt: "2026-08-01T00:00:00Z",
    });
    expect(insights.blueprintSummary.length).toBeGreaterThan(20);
  });
});
