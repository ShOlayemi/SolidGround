import { ScoreRing } from "@/components/assessment/ScoreRing";
import type { BlueprintResults } from "@/types";

interface CompatibilityScoreCardProps {
  results: BlueprintResults | null;
}

export function CompatibilityScoreCard({ results }: CompatibilityScoreCardProps) {
  if (results) {
    return (
      <div className="bg-solid-surface border border-solid-border rounded-xl p-8">
        <h3 className="text-[18px] font-semibold text-solid-text mb-5">
          Compatibility Score
        </h3>
        <div className="flex flex-col items-center text-center">
          <ScoreRing
            score={results.overallScore}
            confidence={results.overallConfidence}
            size="md"
            label="Overall Compatibility"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-solid-surface border border-solid-border rounded-xl p-8">
      <h3 className="text-[18px] font-semibold text-solid-text mb-5">
        Compatibility Score
      </h3>
      <div className="flex flex-col items-center text-center">
        {/* Dashed placeholder circle */}
        <div className="relative mb-4">
          <svg width="120" height="120" className="-rotate-90">
            <circle
              cx="60"
              cy="60"
              r="48"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="8 6"
              className="text-solid-border"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[13px] font-medium text-solid-text-tertiary">
            —
          </span>
        </div>
        <p className="text-[15px] text-solid-text-secondary mb-1">
          Complete your Blueprint to unlock
        </p>
        <p className="text-[14px] text-solid-text-tertiary">
          Compare with a partner after you both finish your assessments.
        </p>
      </div>
    </div>
  );
}
