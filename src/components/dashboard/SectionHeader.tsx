import type { ReactNode } from "react";

interface SectionHeaderProps { title: string; action?: ReactNode; loading?: boolean; error?: string; empty?: boolean; onRetry?: () => void }
export function SectionHeader({ title, action, loading, error, empty, onRetry }: SectionHeaderProps) {
  return <div className="flex items-center justify-between gap-4 border-b border-card-border pb-3"><h2 className="text-lg font-semibold text-text-primary">{loading ? <span className="inline-block h-5 w-32 animate-pulse rounded bg-slate-200" /> : title}</h2>{error ? <span className="text-sm text-text-secondary">{error}{onRetry && <button type="button" onClick={onRetry} className="ml-2 text-accent-600 underline">Retry</button>}</span> : !empty && action}</div>;
}
