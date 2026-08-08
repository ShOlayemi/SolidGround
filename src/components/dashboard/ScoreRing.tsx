interface ScoreRingProps {
  score?: number;
  confidence?: number;
  size?: "lg" | "md" | "sm";
  label?: string;
  loading?: boolean;
  error?: string;
  empty?: boolean;
  onRetry?: () => void;
}

const sizes = {
  lg: { dim: 120, radius: 50, stroke: 9, score: "text-4xl", sub: "text-xs" },
  md: { dim: 80, radius: 33, stroke: 7, score: "text-2xl", sub: "text-[10px]" },
  sm: { dim: 48, radius: 19, stroke: 5, score: "text-sm", sub: "text-[8px]" },
} as const;

function colorFor(score: number): string {
  if (score >= 70) return "var(--color-score-high)";
  if (score >= 45) return "var(--color-score-mid)";
  return "var(--color-score-low)";
}

export function ScoreRing({ score, confidence, size = "lg", label, loading, error, empty, onRetry }: ScoreRingProps) {
  const config = sizes[size];
  if (loading) return <div aria-label="Loading score" className={`animate-pulse rounded-full bg-slate-200 ${size === "lg" ? "h-[120px] w-[120px]" : size === "md" ? "h-20 w-20" : "h-12 w-12"}`} />;
  if (error) return <StateMessage message={error} onRetry={onRetry} />;
  if (score === undefined || empty) return <StateMessage message="No score available" />;

  const bounded = Math.max(0, Math.min(100, score));
  const circumference = 2 * Math.PI * config.radius;
  return (
    <div className="relative inline-flex" aria-label={`Score: ${bounded} out of 100${confidence !== undefined ? `, consistency ${confidence}%` : ""}`} role="img">
      <svg aria-hidden="true" width={config.dim} height={config.dim} className="-rotate-90">
        <circle cx={config.dim / 2} cy={config.dim / 2} r={config.radius} fill="none" stroke="var(--color-ring-track)" strokeWidth={config.stroke} />
        <circle cx={config.dim / 2} cy={config.dim / 2} r={config.radius} fill="none" stroke={colorFor(bounded)} strokeWidth={config.stroke} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference - (bounded / 100) * circumference} className="transition-[stroke-dashoffset] duration-700" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`${config.score} font-bold leading-none tracking-tight tabular-nums`} style={{ color: colorFor(bounded) }}>{bounded}</span>
        {size === "lg" && <span className={`${config.sub} mt-1 text-text-tertiary`}>/100</span>}
        {label && <span className={`${config.sub} mt-0.5 text-text-tertiary`}>{label}</span>}
      </div>
    </div>
  );
}

function StateMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="text-sm text-text-secondary" role="status">{message}{onRetry && <button type="button" onClick={onRetry} className="ml-2 font-medium text-accent-600 underline">Retry</button>}</div>;
}
