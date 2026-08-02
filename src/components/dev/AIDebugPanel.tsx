"use client";
// ──────────────────────────────────────────────────────────────
// SolidGround AI — AI Debug Panel
// ──────────────────────────────────────────────────────────────
// Dev-only diagnostics for the AI pipeline: shows the active
// provider, whether an API call is made, and cache status.
// Collapsible. Renders nothing outside development builds.
// ──────────────────────────────────────────────────────────────

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  getEffectiveMode,
  getModeServerSnapshot,
  providerNameForMode,
  subscribeToModeChanges,
} from "./aiMode";

interface InsightsStatusEvent extends Event {
  detail?: {
    provider?: string;
    cached?: boolean;
    at?: string;
  };
}

interface LastStatus {
  provider: string;
  cached: boolean;
  at: string;
}

const STATUS_EVENT = "ai:insights-status";
const LAST_STATUS_KEY = "ai-debug-last-status";

function readLastStatus(): LastStatus | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(LAST_STATUS_KEY);
    return stored ? (JSON.parse(stored) as LastStatus) : null;
  } catch {
    return null;
  }
}

export function AIDebugPanel() {
  const [open, setOpen] = useState(false);
  const [lastStatus, setLastStatus] = useState<LastStatus | null>(null);
  const provider = useSyncExternalStore(
    subscribeToModeChanges,
    () => providerNameForMode(getEffectiveMode()),
    () => providerNameForMode(getModeServerSnapshot()),
  );

  useEffect(() => {
    // Live status events (dispatched when AI insights are fetched)
    const onStatus = (e: Event) => {
      const detail = (e as InsightsStatusEvent).detail;
      if (!detail) return;
      const next: LastStatus = {
        provider: detail.provider ?? providerNameForMode(getEffectiveMode()),
        cached: detail.cached ?? false,
        at: detail.at ?? new Date().toISOString(),
      };
      setLastStatus(next);
      try {
        window.localStorage.setItem(LAST_STATUS_KEY, JSON.stringify(next));
      } catch {
        // Storage may be unavailable; panel state is enough.
      }
    };
    window.addEventListener(STATUS_EVENT, onStatus);
    return () => window.removeEventListener(STATUS_EVENT, onStatus);
  }, []);

  if (process.env.NODE_ENV !== "development") return null;

  const apiCalled = provider === "OpenAIProvider";
  const persistLastStatus = lastStatus ?? readLastStatus();

  return (
    <div className="rounded-lg border border-dashed border-card-border bg-slate-50/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-text-primary">AI Debug Panel</span>
        <span className="text-sm text-text-tertiary">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <dl className="space-y-2 border-t border-card-border px-4 py-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-text-secondary">Current Provider</dt>
            <dd className="font-medium text-text-primary">{provider}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-text-secondary">API called</dt>
            <dd className={`font-medium ${apiCalled ? "text-amber-600" : "text-emerald-600"}`}>
              {apiCalled
                ? "Yes — OpenAI gpt-4o-mini (server-side)"
                : "No — deterministic local generation"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-text-secondary">Cache status</dt>
            <dd className="font-medium text-text-primary">
              {persistLastStatus
                ? persistLastStatus.cached
                  ? "Served from cache (ai_insights table)"
                  : "Generated fresh (last fetch " + persistLastStatus.at + ")"
                : "On — ai_insights table caches per-session results"}
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}
