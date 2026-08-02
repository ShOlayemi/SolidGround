import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ScoreRing } from "./ScoreRing";
import { SkeletonCard } from "./Skeleton";

type BaseProps = { className?: string; loading?: boolean; error?: string; empty?: boolean; onRetry?: () => void };
type MetricProps = BaseProps & { variant: "metric"; value?: string | number; label: string };
type ScoreProps = BaseProps & { variant: "score"; score?: number; label: string };
type ProgressProps = BaseProps & { variant: "progress"; percentage?: number; label: string };
type InsightProps = BaseProps & { variant: "insight"; icon: LucideIcon; title: string; body: ReactNode };
export type StatCardProps = MetricProps | ScoreProps | ProgressProps | InsightProps;

export function StatCard(props: StatCardProps) {
  const { className = "", loading, error, empty, onRetry } = props;
  if (loading) return <SkeletonCard className={`h-36 ${className}`} />;
  if (error) return <State message={error} onRetry={onRetry} className={className} />;
  if (empty) return <State message="No data available" className={className} />;
  let content: ReactNode;
  if (props.variant === "metric") {
    if (props.value === undefined) return <State message="No data available" className={className} />;
    content = <><p className="text-3xl font-semibold tracking-tight text-text-primary tabular-nums">{props.value}</p><p className="mt-2 text-sm text-text-secondary">{props.label}</p></>;
  } else if (props.variant === "score") {
    content = props.score === undefined ? <State message="No score available" /> : <div className="flex items-center gap-4"><ScoreRing score={props.score} size="sm" /><span className="text-sm font-medium text-text-secondary">{props.label}</span></div>;
  } else if (props.variant === "progress") {
    if (props.percentage === undefined) return <State message="No progress available" className={className} />;
    const value = Math.max(0, Math.min(100, props.percentage));
    content = <div><div className="flex justify-between text-sm"><span className="font-medium text-text-secondary">{props.label}</span><span className="font-semibold tabular-nums text-text-primary">{value}%</span></div><div className="mt-3 h-2.5 rounded-full bg-slate-100" role="progressbar" aria-label={`${props.label} progress`} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><div aria-hidden="true" className="h-full rounded-full bg-accent-500 transition-[width]" style={{ width: `${value}%` }} /></div></div>;
  } else {
    const Icon = props.icon;
    content = <div className="flex gap-3"><Icon className="mt-0.5 shrink-0 text-accent-600" size={20} /><div><h3 className="font-semibold text-text-primary">{props.title}</h3><div className="mt-1 text-sm leading-5 text-text-secondary">{props.body}</div></div></div>;
  }
  return <article className={`rounded-xl border border-card-border bg-card-bg p-6 ${className}`}>{content}</article>;
}
function State({ message, onRetry, className = "" }: { message: string; onRetry?: () => void; className?: string }) { return <div className={`rounded-xl border border-card-border bg-card-bg p-6 text-sm text-text-secondary ${className}`} role="status">{message}{onRetry && <button type="button" onClick={onRetry} className="ml-2 text-accent-600 underline">Retry</button>}</div>; }
