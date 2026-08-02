"use client";
// ──────────────────────────────────────────────────────────────
// SolidGround AI — AI Mode Developer Toggle
// ──────────────────────────────────────────────────────────────
// Dev-only toggle that switches the AI provider between Mock and
// OpenAI via the localStorage `ai-mode` key. Renders nothing
// outside development builds.
// ──────────────────────────────────────────────────────────────

import { useSyncExternalStore } from "react";
import {
  getEffectiveMode,
  getModeServerSnapshot,
  setModeOverride,
  subscribeToModeChanges,
  type AIMode,
} from "./aiMode";

export function AIModeToggle() {
  const mode = useSyncExternalStore<AIMode>(
    subscribeToModeChanges,
    getEffectiveMode,
    getModeServerSnapshot,
  );

  if (process.env.NODE_ENV !== "development") return null;

  const buttonBase =
    "rounded-lg border px-4 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600";

  return (
    <div>
      <h3 className="text-sm font-semibold text-text-primary">AI Provider Mode</h3>
      <p className="mt-1 text-sm text-text-secondary">
        Select which provider generates AI insights. The override is stored in
        your browser (localStorage <code className="text-accent-600">ai-mode</code>)
        and takes precedence over <code className="text-accent-600">NEXT_PUBLIC_AI_MODE</code>.
      </p>

      <div role="radiogroup" aria-label="AI provider mode" className="mt-4 flex items-center gap-3">
        <button
          type="button"
          role="radio"
          aria-checked={mode === "mock"}
          onClick={() => setModeOverride("mock")}
          className={`${buttonBase} ${
            mode === "mock"
              ? "border-accent-600 bg-accent-50 text-accent-700"
              : "border-card-border bg-card-bg text-text-secondary hover:border-slate-300"
          }`}
        >
          {mode === "mock" ? "●" : "○"} Mock
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={mode === "openai"}
          onClick={() => setModeOverride("openai")}
          className={`${buttonBase} ${
            mode === "openai"
              ? "border-accent-600 bg-accent-50 text-accent-700"
              : "border-card-border bg-card-bg text-text-secondary hover:border-slate-300"
          }`}
        >
          {mode === "openai" ? "●" : "○"} OpenAI
        </button>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
            mode === "mock"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-violet-50 text-violet-700"
          }`}
        >
          {mode === "mock" ? "🟢 Mock AI" : "🟣 OpenAI"}
        </span>
      </div>
    </div>
  );
}
