// ──────────────────────────────────────────────────────────────
// SolidGround AI — AI Provider Factory
// ──────────────────────────────────────────────────────────────
// Selects the active AI provider based on:
//   1. A developer override in localStorage (`ai-mode`), if present
//   2. The NEXT_PUBLIC_AI_MODE environment variable ("mock" | "openai")
//   3. OpenAI by default
// The singleton `aiProvider` is resolved once at module load.
// ──────────────────────────────────────────────────────────────

import { OpenAIProvider } from "./providers/OpenAIProvider";
import { MockProvider } from "./providers/MockProvider";
import type { AIProvider as AIProviderInterface } from "./providers/types";

function getProvider(): AIProviderInterface {
  if (typeof window !== "undefined") {
    const localOverride = localStorage.getItem("ai-mode");
    if (localOverride === "mock") return new MockProvider();
    if (localOverride === "openai") return new OpenAIProvider();
  }
  if (process.env.NEXT_PUBLIC_AI_MODE === "mock") return new MockProvider();
  return new OpenAIProvider();
}

export const aiProvider = getProvider();
export type AIProvider = AIProviderInterface;
