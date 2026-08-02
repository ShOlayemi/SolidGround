import type { ReactNode } from "react";
import { Check, Sprout, Lightbulb, Info } from "lucide-react";
import { SkeletonText } from "./Skeleton";

type InsightVariant = "strength" | "growth" | "tip" | "default";
interface InsightCardProps { icon?: ReactNode; title?: string; children?: ReactNode; variant?: InsightVariant; loading?: boolean; error?: string; empty?: boolean; onRetry?: () => void }
const styles: Record<InsightVariant, { icon: string; bg: string; Icon: typeof Check }> = { strength: { icon: "text-success-600", bg: "bg-success-50", Icon: Check }, growth: { icon: "text-warning-600", bg: "bg-warning-50", Icon: Sprout }, tip: { icon: "text-info-600", bg: "bg-info-50", Icon: Lightbulb }, default: { icon: "text-text-secondary", bg: "bg-slate-100", Icon: Info } };
export function InsightCard({ icon, title, children, variant = "default", loading, error, empty, onRetry }: InsightCardProps) {
  const style = styles[variant];
  if (loading) return <div className="rounded-xl border border-card-border bg-card-bg p-6"><SkeletonText lines={3} /></div>;
  if (error) return <State message={error} onRetry={onRetry} />;
  if (empty || !title) return <State message="No insight available" />;
  const DefaultIcon = style.Icon;
  return <article className="rounded-xl border border-card-border bg-card-bg p-6"><div className="flex gap-4"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${style.bg} ${style.icon}`}>{icon ?? <DefaultIcon size={20} strokeWidth={1.8} />}</div><div className="min-w-0"><h3 className="font-semibold text-text-primary">{title}</h3><div className="mt-2 text-sm leading-6 text-text-secondary">{children}</div></div></div></article>;
}
function State({ message, onRetry }: { message: string; onRetry?: () => void }) { return <div className="rounded-xl border border-card-border bg-card-bg p-6 text-sm text-text-secondary" role="status">{message}{onRetry && <button type="button" onClick={onRetry} className="ml-2 text-accent-600 underline">Retry</button>}</div>; }
