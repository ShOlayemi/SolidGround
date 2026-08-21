// ──────────────────────────────────────────────────────────────
// SolidGround AI — Effective AI Mode (server-side truth)
// ──────────────────────────────────────────────────────────────
// Dev tooling WANTS to know whether the SERVER actually has an
// OPENAI_API_KEY (a server-only secret) and therefore whether the
// coach is really calling OpenAI or silently falling back to the
// deterministic MockProvider. A client component cannot see that
// env var, so this module centralises the truth on the server and
// exposes ONLY a presence boolean — never the key value.
//
// The mode-selection logic is deliberately reused (not re-implemented)
// from src/lib/ai/coach-reply.ts isMockCoachMode(): provider mode is
// "mock" (NEXT_PUBLIC_AI_MODE) OR no OpenAI key is configured → mock.
// ──────────────────────────────────────────────────────────────
import { isMockCoachMode } from "./coach-reply";

export type AIEffectiveMode = "openai" | "mock";

export interface AIEffectiveModeStatus {
  /** The mode the coach will actually run in right now. */
  mode: AIEffectiveMode;
  /** True when the server has OPENAI_API_KEY set. Presence only. */
  openaiKeySet: boolean;
}

/**
 * Return the EFFECTIVE server AI mode plus the key-presence signal.
 * Read at call time so env changes toggle it freely.
 */
export function getAIModeStatus(): AIEffectiveModeStatus {
  const openaiKeySet = Boolean(process.env.OPENAI_API_KEY);
  return {
    mode: isMockCoachMode() ? "mock" : "openai",
    openaiKeySet,
  };
}
