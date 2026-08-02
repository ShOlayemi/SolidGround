import type { ReactNode } from "react";
import { SectionHeader } from "./SectionHeader";

interface ChartContainerProps { title: string; description?: string; children?: ReactNode; className?: string; loading?: boolean; error?: string; empty?: boolean; onRetry?: () => void }
export function ChartContainer({ title, description, children, className = "", loading, error, empty, onRetry }: ChartContainerProps) {
  return <section className={`rounded-xl border border-card-border bg-card-bg p-6 ${className}`}><SectionHeader title={title} loading={loading} error={error} empty={empty} onRetry={onRetry} />{description && !loading && <p className="mt-3 text-sm text-text-secondary">{description}</p>}<div className="pt-6">{loading ? <div className="h-48 animate-pulse rounded-lg bg-slate-200" /> : error ? <p className="text-sm text-text-secondary" role="alert">Unable to load chart data.</p> : empty ? <p className="py-12 text-center text-sm text-text-secondary">No chart data available.</p> : children}</div></section>;
}
