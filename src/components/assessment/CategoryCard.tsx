"use client";

// ──────────────────────────────────────────────────────────────
// SolidGround AI — Category Card
// ──────────────────────────────────────────────────────────────

import type { CategoryResult } from "@/lib/scoring/types";

interface CategoryCardProps {
  result: CategoryResult;
}

function scoreColor(score: number): string {
  if (score >= 70) return "#2E4A3A";
  if (score >= 40) return "#C4943A";
  return "#C44E4E";
}

export function CategoryCard({ result }: CategoryCardProps) {
  const { label, score, confidence, dealBreakerTriggered, questionScores } =
    result;
  const questionCount = Object.keys(questionScores).length;
  const color = scoreColor(score);

  return (
    <div className="bg-solid-surface border border-solid-border rounded-xl p-6 flex flex-col gap-4 hover:border-solid-accent/20 transition-colors duration-200">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-solid-text leading-snug">
            {label}
          </h3>
          <p className="text-[12px] text-solid-text-tertiary mt-0.5">
            {questionCount} question{questionCount !== 1 ? "s" : ""} ·{" "}
            {confidence}% confidence
          </p>
        </div>
        <span
          className="text-[24px] font-semibold tracking-tight shrink-0"
          style={{ color, lineHeight: 1 }}
        >
          {score}
        </span>
      </div>

      {/* Score bar */}
      <div className="w-full h-2 rounded-full bg-solid-border overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{
            width: `${Math.min(score, 100)}%`,
            backgroundColor: color,
          }}
        />
      </div>

      {/* Deal-breaker warning */}
      {dealBreakerTriggered && (
        <div className="flex items-center gap-2 text-[13px] font-medium text-solid-error">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
            <path d="M12 8v4" />
            <circle cx="12" cy="16" r="0.5" fill="currentColor" stroke="none" />
          </svg>
          Deal-breaker triggered
        </div>
      )}
    </div>
  );
}
