import type { AIInsights } from "@/types";

interface AIInsightsCardProps {
  insights: AIInsights | null;
  hasResults: boolean;
  sessionId: string | null;
}

export function AIInsightsCard({
  insights,
  hasResults,
  sessionId,
}: AIInsightsCardProps) {
  // ── Insights exist → show summary snippet ──────────────────
  if (insights) {
    return (
      <div className="bg-solid-surface border border-solid-border rounded-xl p-8">
        <div className="flex items-start gap-4 mb-3">
          <div className="w-10 h-10 rounded-lg bg-solid-accent-subtle flex items-center justify-center shrink-0 mt-0.5">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-solid-accent"
            >
              <path d="M12 2a3 3 0 0 0-3 3v1a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
              <path d="M8 10h8" />
              <path d="M8 14h6" />
              <path d="M8 18h4" />
              <circle cx="12" cy="5" r="1" />
            </svg>
          </div>
          <div>
            <h3 className="text-[18px] font-semibold text-solid-text mb-1">
              AI Insights
            </h3>
          </div>
        </div>
        <p className="text-[14px] text-solid-text-secondary leading-relaxed line-clamp-3">
          {insights.blueprintSummary}
        </p>
        <div className="mt-3">
          <span
            className={`inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-full ${
              insights.relationshipReadiness.level === "High"
                ? "bg-[#2E4A3A]/10 text-[#2E4A3A]"
                : insights.relationshipReadiness.level === "Moderate"
                  ? "bg-[#C4943A]/10 text-[#C4943A]"
                  : "bg-solid-accent-subtle text-solid-accent"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                insights.relationshipReadiness.level === "High"
                  ? "bg-[#2E4A3A]"
                  : insights.relationshipReadiness.level === "Moderate"
                    ? "bg-[#C4943A]"
                    : "bg-solid-accent"
              }`}
            />
            {insights.relationshipReadiness.level} Readiness
          </span>
        </div>
        {sessionId && (
          <a
            href={`/dashboard/blueprint/results?sessionId=${sessionId}`}
            className="inline-block mt-3 text-[13px] text-solid-accent hover:underline"
          >
            View full insights →
          </a>
        )}
      </div>
    );
  }

  // ── Results exist but no insights → prompt to generate ─────
  if (hasResults && sessionId) {
    return (
      <div className="bg-solid-surface border border-solid-border rounded-xl p-8">
        <div className="flex items-start gap-4 mb-3">
          <div className="w-10 h-10 rounded-lg bg-solid-accent-subtle flex items-center justify-center shrink-0 mt-0.5">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-solid-accent"
            >
              <path d="M12 2a3 3 0 0 0-3 3v1a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
              <path d="M8 10h8" />
              <path d="M8 14h6" />
              <path d="M8 18h4" />
              <circle cx="12" cy="5" r="1" />
            </svg>
          </div>
          <div>
            <h3 className="text-[18px] font-semibold text-solid-text mb-1">
              AI Insights
            </h3>
          </div>
        </div>
        <p className="text-[15px] text-solid-text-secondary leading-relaxed mb-4">
          Your Compatibility Blueprint™ is ready. Generate AI-powered insights
          to understand your relationship patterns, strengths, and growth areas.
        </p>
        <a
          href={`/dashboard/blueprint/results?sessionId=${sessionId}`}
          className="inline-flex items-center gap-2 text-[14px] font-medium text-solid-accent hover:underline"
        >
          Generate AI Insights →
        </a>
      </div>
    );
  }

  // ── No results → placeholder ───────────────────────────────
  return (
    <div className="bg-solid-surface border border-solid-border rounded-xl p-8">
      <div className="flex items-start gap-4 mb-3">
        <div className="w-10 h-10 rounded-lg bg-solid-accent-subtle flex items-center justify-center shrink-0 mt-0.5">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-solid-accent"
          >
            <path d="M12 2a3 3 0 0 0-3 3v1a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
            <path d="M8 10h8" />
            <path d="M8 14h6" />
            <path d="M8 18h4" />
            <circle cx="12" cy="5" r="1" />
          </svg>
        </div>
        <div>
          <h3 className="text-[18px] font-semibold text-solid-text mb-1">
            AI Insights
          </h3>
          <span className="inline-block text-[11px] font-medium uppercase tracking-wider text-solid-text-tertiary bg-solid-accent-subtle/50 px-2 py-0.5 rounded-full">
            Coming soon
          </span>
        </div>
      </div>
      <p className="text-[15px] text-solid-text-secondary leading-relaxed">
        Receive personalized relationship insights after completing your
        Blueprint.
      </p>
    </div>
  );
}
