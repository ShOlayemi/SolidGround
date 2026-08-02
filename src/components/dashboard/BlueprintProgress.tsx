import Link from "next/link";
import type { BlueprintStatus, AssessmentProgress } from "@/types";

interface BlueprintProgressProps {
  status: BlueprintStatus;
  progress: AssessmentProgress | null;
  sessionId: string | null;
}

function ProgressRing({ percentage }: { percentage: number }) {
  const radius = 48;
  const strokeWidth = 5;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="120" height="120" className="-rotate-90">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-solid-border"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-solid-accent transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span className="absolute text-[28px] font-semibold tracking-tight text-solid-text">
        {percentage}%
      </span>
    </div>
  );
}

export function BlueprintProgress({
  status,
  progress,
  sessionId,
}: BlueprintProgressProps) {
  const percentage = progress?.percentage ?? 0;

  const ctaLink =
    status === "not_started"
      ? "/dashboard/blueprint"
      : status === "in_progress" && sessionId
        ? `/dashboard/blueprint/assess?sessionId=${sessionId}`
        : status === "complete" && sessionId
          ? `/dashboard/blueprint/results?sessionId=${sessionId}`
          : "/dashboard/blueprint";

  const ctaLabel =
    status === "not_started"
      ? "Start Blueprint"
      : status === "in_progress"
        ? "Continue"
        : "View Results";

  const ctaIsOutline = status === "complete";

  const statusLabel =
    status === "not_started"
      ? "Not started"
      : status === "in_progress"
        ? "In progress"
        : "Complete";

  return (
    <div className="bg-solid-surface border border-solid-border rounded-xl p-8">
      <div className="flex flex-col sm:flex-row sm:items-center gap-6">
        <ProgressRing percentage={percentage} />
        <div className="flex-1 min-w-0">
          <h3 className="text-[18px] font-semibold text-solid-text mb-1">
            Compatibility Blueprint
          </h3>
          <p className="text-[14px] text-solid-text-tertiary mb-1">
            {statusLabel}
          </p>
          <p className="text-[15px] text-solid-text-secondary mb-5">
            Discover your compatibility profile across five dimensions: Values,
            Communication, Finances, Lifestyle, and Growth.
          </p>
          <Link
            href={ctaLink}
            className={
              ctaIsOutline
                ? "inline-flex items-center justify-center rounded-lg font-medium transition-colors duration-150 focus:outline-none px-6 py-3.5 text-[14px] leading-[1.4] bg-transparent border border-solid-accent text-solid-accent hover:bg-solid-accent-subtle/50 focus:ring-2 focus:ring-solid-accent/20"
                : "inline-flex items-center justify-center rounded-lg font-medium transition-colors duration-150 focus:outline-none px-6 py-3.5 text-[14px] leading-[1.4] bg-solid-accent text-white hover:bg-solid-accent-hover focus:ring-2 focus:ring-solid-accent/20"
            }
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
