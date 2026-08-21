"use client";
// ──────────────────────────────────────────────────────────────
// SolidGround AI — Live AI Mode Indicator (dev)
// ──────────────────────────────────────────────────────────────
// Shows which AI provider the SERVER will actually use, based on the
// effective mode + OPENAI_API_KEY presence reported by the server
// action (see src/lib/ai/aiModeStatus.ts). This is the difference
// from AIModeToggle's badge, which can only read the PUBLIC
// NEXT_PUBLIC_AI_MODE env var and can't tell when the server has no
// key and is silently falling back to the deterministic MockProvider.
//
// Three states:
//   1. mode=openai + key set     → "Live: OpenAI gpt-4o-mini"
//   2. mode=mock (env mock)      → "Live: Mock (deterministic)"
//   3. mode=mock + key missing   → warning "OpenAI configured but no
//      OPENAI_API_KEY on server — falling back to Mock"
// Renders nothing outside development builds.
// ──────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import {
  getDevAIModeStatus,
  verifyOpenAIKey,
  type VerifyKeyResult,
} from "@/lib/ai/aiModeActions";
import type { AIEffectiveModeStatus } from "@/lib/ai/aiModeStatus";

type IndicatorTone = "openai" | "mock" | "warning" | "muted";

interface IndicatorView {
  tone: IndicatorTone;
  title: string;
  detail: string;
}

function buildView(status: AIEffectiveModeStatus): IndicatorView {
  if (status.mode === "openai") {
    return {
      tone: "openai",
      title: "Live: OpenAI gpt-4o-mini",
      detail: "Server key present — the AI coach is calling OpenAI directly.",
    };
  }
  if (!status.openaiKeySet) {
    return {
      tone: "warning",
      title: "OpenAI configured but no OPENAI_API_KEY on server — falling back to Mock",
      detail: "The AI coach is silently using the deterministic MockProvider instead of OpenAI.",
    };
  }
  return {
    tone: "mock",
    title: "Live: Mock (deterministic)",
    detail: "NEXT_PUBLIC_AI_MODE=mock — the AI coach is using the offline, deterministic provider.",
  };
}

const TONE_CLASSES: Record<IndicatorTone, { badge: string; dot: string }> = {
  openai: { badge: "bg-violet-50 text-violet-700 border-violet-200", dot: "bg-violet-500" },
  mock: { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  warning: { badge: "bg-amber-50 text-amber-700 border-amber-300", dot: "bg-amber-500" },
  muted: { badge: "bg-slate-50 text-text-tertiary border-card-border", dot: "bg-slate-300" },
};

export function AIModeStatusIndicator() {
  const [status, setStatus] = useState<AIEffectiveModeStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const [verify, setVerify] = useState<VerifyKeyResult | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    let active = true;
    getDevAIModeStatus()
      .then((value) => {
        if (active) setStatus(value);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (process.env.NODE_ENV !== "development") return null;

  const onVerify = async () => {
    setVerifying(true);
    setVerify(null);
    try {
      setVerify(await verifyOpenAIKey());
    } catch {
      setVerify({ status: "error", message: "Request failed" });
    } finally {
      setVerifying(false);
    }
  };

  const view: IndicatorView | null =
    status !== null
      ? buildView(status)
      : failed
        ? { tone: "muted", title: "Could not reach the server to check AI mode.", detail: "Refresh to retry." }
        : null;

  const tone = view?.tone ?? "muted";
  const toneClass = TONE_CLASSES[tone];
  const verifyLabel =
    verify === null
      ? null
      : verify.status === "valid"
        ? "✓ Key valid"
        : verify.status === "invalid"
          ? "✕ Key invalid"
          : verify.status === "no-key"
            ? "No key on server"
            : verify.status === "disabled"
              ? "Unavailable outside dev"
              : "Error: " + verify.message;

  return (
    <div className="rounded-lg border border-card-border bg-slate-50/50 p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 shrink-0 rounded-full ${toneClass.dot}`} />
          <span className="text-sm font-semibold text-text-primary">
            {view ? view.title : "Checking server AI mode…"}
          </span>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${toneClass.badge}`}
        >
          {view === null ? (failed ? "⚠" : "…") : tone === "openai" ? "🟣" : tone === "mock" ? "🟢" : "🟡"} Live
        </span>
      </div>
      {view && (
        <p className="mt-2 text-xs text-text-secondary">{view.detail}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void onVerify()}
          disabled={verifying}
          className="rounded-md border border-card-border bg-card-bg px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:border-slate-300 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {verifying ? "Verifying…" : "Verify OpenAI key"}
        </button>
        {status && (
          <span className="text-xs text-text-tertiary">
            Server key: {status.openaiKeySet ? "set" : "not set"}
          </span>
        )}
        {verifyLabel && (
          <span
            className={`text-xs font-medium ${
              verify?.status === "valid"
                ? "text-emerald-600"
                : verify?.status === "invalid"
                  ? "text-red-600"
                  : "text-amber-600"
            }`}
          >
            {verifyLabel}
          </span>
        )}
      </div>
    </div>
  );
}
