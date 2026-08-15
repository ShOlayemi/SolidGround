import { Target, MessagesSquare, ListChecks, NotebookPen } from "lucide-react";
import type { JourneyCounts } from "@/lib/journey/types";
import { topicsRemaining } from "@/lib/journey/display";

/**
 * SolidGround AI — Journey progress summary.
 *
 * REAL persisted counts only (from getJourneyDashboard().counts) — no
 * invented percentages in the copy. The topics progress bar is semantically
 * a ratio (aria-valuemin 0 / aria-valuemax = topicsTotal / aria-valuenow =
 * topicsDiscussed) and its visual width is derived from those same counts.
 */
export function JourneyProgressSummary({ counts }: { counts: JourneyCounts }) {
  const remaining = topicsRemaining(counts);
  const width =
    counts.topicsTotal > 0
      ? `${Math.round((counts.topicsDiscussed / counts.topicsTotal) * 100)}%`
      : "0%";

  return (
    <section aria-label="Journey progress" className="rounded-xl border border-card-border bg-card-bg p-6">
      <h2 className="text-base font-semibold text-text-primary">Your progress at a glance</h2>

      {/* Conversation topics — the dashboard's primary metric. */}
      <div className="mt-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-medium text-text-secondary">Topics discussed</span>
          <span className="text-sm font-semibold tabular-nums text-text-primary">
            {counts.topicsDiscussed} of {counts.topicsTotal}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Conversation topics discussed"
          aria-valuemin={0}
          aria-valuemax={counts.topicsTotal}
          aria-valuenow={counts.topicsDiscussed}
          className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-slate-100"
        >
          <div
            aria-hidden="true"
            className="h-full rounded-full bg-accent-500 transition-[width] duration-300"
            style={{ width }}
          />
        </div>
      </div>

      {/* Stat row — counts only, mirroring the mobile CountsCard groups. */}
      <div className="mt-6 grid grid-cols-1 gap-4 border-t border-card-border pt-5 sm:grid-cols-3">
        <Stat icon={MessagesSquare} label="Conversations" value={counts.topicsTotal} hint="areas to explore" />
        <Stat icon={Target} label="Goals active" value={counts.goalsActive} hint="in progress together" />
        <Stat icon={ListChecks} label="Goals completed" value={counts.goalsCompleted} hint="achieved together" />
      </div>

      <p className="mt-5 flex items-center gap-1.5 text-xs text-text-tertiary">
        <NotebookPen size={13} strokeWidth={1.5} />
        {remaining === 0
          ? "All topics discussed — well done. New topics appear as your Alignment Match™ evolves."
          : `${remaining} topic${remaining === 1 ? "" : "s"} left to discuss.`}
      </p>
    </section>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Target;
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent-700">
        <Icon size={15} strokeWidth={1.5} />
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-semibold leading-6 tabular-nums tracking-tight text-text-primary">{value}</p>
        <p className="mt-1 text-sm font-medium text-text-secondary">{label}</p>
        <p className="truncate text-xs text-text-tertiary">{hint}</p>
      </div>
    </div>
  );
}
