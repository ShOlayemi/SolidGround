// ──────────────────────────────────────────────────────────────
// SolidGround AI — Dev AI Mode helper
// ──────────────────────────────────────────────────────────────
// Shared precedence logic for the developer tools. Mirrors the
// provider factory: localStorage override wins, then the
// NEXT_PUBLIC_AI_MODE env var, then OpenAI by default.
// Deliberately standalone — importing the factory here would pull
// the OpenAI SDK into client bundles.
// ──────────────────────────────────────────────────────────────

export type AIMode = "mock" | "openai";

export const AI_MODE_CHANGE_EVENT = "ai-mode-change";

export function getEffectiveMode(): AIMode {
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem("ai-mode");
    if (stored === "mock" || stored === "openai") return stored;
  }
  return process.env.NEXT_PUBLIC_AI_MODE === "mock" ? "mock" : "openai";
}

export function getModeServerSnapshot(): AIMode {
  return process.env.NEXT_PUBLIC_AI_MODE === "mock" ? "mock" : "openai";
}

export function subscribeToModeChanges(onStoreChange: () => void): () => void {
  window.addEventListener(AI_MODE_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(AI_MODE_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function providerNameForMode(mode: AIMode): string {
  return mode === "mock" ? "MockProvider" : "OpenAIProvider";
}

export function setModeOverride(mode: AIMode): void {
  window.localStorage.setItem("ai-mode", mode);
  window.dispatchEvent(new Event(AI_MODE_CHANGE_EVENT));
}
