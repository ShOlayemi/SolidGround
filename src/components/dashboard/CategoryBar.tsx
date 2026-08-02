interface CategoryBarProps {
  label?: string;
  score?: number;
  className?: string;
  loading?: boolean;
  error?: string;
  empty?: boolean;
  onRetry?: () => void;
}

function scoreColor(score: number) { return score >= 70 ? "var(--color-score-high)" : score >= 40 ? "var(--color-score-mid)" : "var(--color-score-low)"; }

export function CategoryBar({ label, score, className = "", loading, error, empty, onRetry }: CategoryBarProps) {
  if (loading) return <div className={`animate-pulse space-y-2 ${className}`}><div className="h-4 w-1/3 rounded bg-slate-200" /><div className="h-2.5 w-full rounded-full bg-slate-200" /></div>;
  if (error) return <State message={error} onRetry={onRetry} />;
  if (empty || score === undefined || !label) return <State message="No category data available" />;
  const value = Math.max(0, Math.min(100, score));
  return <div className={`space-y-2 ${className}`}><div className="flex justify-between gap-4 text-sm"><span className="font-medium text-text-primary">{label}</span><span className="font-semibold tabular-nums text-text-secondary">{value}%</span></div><div className="h-2.5 w-full rounded-full bg-slate-100" role="progressbar" aria-label={`${label} score`} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><div aria-hidden="true" className="h-full rounded-full transition-[width] duration-500" style={{ width: `${value}%`, backgroundColor: scoreColor(value) }} /></div></div>;
}
function State({ message, onRetry }: { message: string; onRetry?: () => void }) { return <p className="text-sm text-text-secondary" role="status">{message}{onRetry && <button type="button" onClick={onRetry} className="ml-2 text-accent-600 underline">Retry</button>}</p>; }
