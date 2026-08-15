import { Target, Handshake, NotebookPen } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SharedAgreement, SharedGoal } from "@/lib/journey/types";

/**
 * SolidGround AI — Journey placeholder cards for Goals / Agreements /
 * Reflections ("coming next").
 *
 * The full screens are a follow-up task; these lightweight cards show the
 * REAL persisted counts from the dashboard payload so the section feels
 * grounded, plus an honest "Coming next" note instead of dead links.
 */
export function JourneyComingSoonSection({
  goals,
  agreements,
  reflectionsCount,
}: {
  goals: SharedGoal[];
  agreements: SharedAgreement[];
  reflectionsCount: number;
}) {
  const activeGoals = goals.filter((goal) => goal.status !== "completed").length;
  const completedGoals = goals.length - activeGoals;

  return (
    <section aria-label="Coming next in your Journey">
      <h2 className="text-base font-semibold text-text-primary">Coming next</h2>
      <p className="mt-1 text-sm text-text-secondary">
        The full Journey experience is rolling out — these spaces are on the way.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <ComingSoonCard
          icon={Target}
          title="Shared goals"
          count={`${goals.length === 0 ? "No goals" : `${activeGoals} active${completedGoals > 0 ? ` · ${completedGoals} completed` : ""}`}`}
          description="Work toward what you both want — together."
        />
        <ComingSoonCard
          icon={Handshake}
          title="Agreements"
          count={`${agreements.length === 0 ? "No agreements" : `${agreements.length} agreement${agreements.length === 1 ? "" : "s"}`}`}
          description="Write down how you'll show up for each other."
        />
        <ComingSoonCard
          icon={NotebookPen}
          title="Reflections"
          count={`${reflectionsCount === 0 ? "No reflections" : `${reflectionsCount} private reflection${reflectionsCount === 1 ? "" : "s"}`}`}
          description="Notes that stay just yours — never shared."
        />
      </div>
    </section>
  );
}

function ComingSoonCard({
  icon: Icon,
  title,
  count,
  description,
}: {
  icon: LucideIcon;
  title: string;
  count: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-card-border bg-card-bg p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-50 text-accent-700">
          <Icon size={16} strokeWidth={1.5} />
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
          Coming next
        </span>
      </div>
      <h3 className="mt-3.5 text-sm font-semibold text-text-primary">{title}</h3>
      <p className="mt-0.5 text-xs font-medium tabular-nums text-text-secondary">{count}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-text-tertiary">{description}</p>
    </div>
  );
}
