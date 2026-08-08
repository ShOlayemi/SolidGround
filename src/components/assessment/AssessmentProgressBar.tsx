"use client";

interface AssessmentProgressBarProps {
  currentQuestion: number;
  totalQuestions: number;
  categoryLabel?: string;
  categoryQuestion?: number;
  categoryTotal?: number;
  percentage: number;
}

export function AssessmentProgressBar({
  currentQuestion,
  totalQuestions,
  percentage,
  categoryLabel,
  categoryQuestion,
  categoryTotal,
}: AssessmentProgressBarProps) {
  return (
    <div className="w-full">
      {/* Label */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] text-solid-text-secondary">
          {categoryLabel ? `${categoryLabel} · Q${categoryQuestion} of ${categoryTotal}` : `Question ${currentQuestion} of ${totalQuestions}`}
        </span>
        <span className="text-[13px] font-medium text-solid-text-secondary tabular-nums">
          {percentage}% complete
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="w-full h-1 rounded-full bg-solid-border overflow-hidden"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${percentage}% complete`}
      >
        <div
          className="h-full rounded-full bg-solid-accent transition-[width] duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
