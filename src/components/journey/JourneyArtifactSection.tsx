import Link from "next/link";
import { Target, Handshake, NotebookPen, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SharedAgreement, SharedGoal } from "@/lib/journey/types";

/**
 * SolidGround AI — Journey artifact links (Goals / Agreements / Reflections).
 *
 * Entry cards from the Journey dashboard into the three full screens. Each
 * card shows the REAL persisted count from the dashboard payload so the
 * section feels grounded, and links straight to its screen.
 */
export function JourneyArtifactSection({
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
    <section aria-label="Your Journey artifacts">
      <h2 className="text-base font-semibold text-text-primary">Your growth plan</h2>
      <p className="mt-1 text-sm text-text-secondary">
        Goals, agreements, and private reflections — everything you build together in one place.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <ArtifactCard
          href="/dashboard/journey/goals"
          icon={Target}
          title="Shared goals"
          count={goals.length === 0 ? "No goals yet" : `${activeGoals} active${completedGoals > 0 ? ` · ${completedGoals} completed` : ""}`}
          description="Work toward what you both want — together."
        />
        <ArtifactCard
          href="/dashboard/journey/agreements"
          icon={Handshake}
          title="Agreements"
          count={agreements.length === 0 ? "No agreements yet" : `${agreements.length} agreement${agreements.length === 1 ? "" : "s"}`}
          description="Write down how you'll show up for each other."
        />
        <ArtifactCard
          href="/dashboard/journey/reflections"
          icon={NotebookPen}
          title="Reflections"
          count={reflectionsCount === 0 ? "No reflections yet" : `${reflectionsCount} private reflection${reflectionsCount === 1 ? "" : "s"}`}
          description="Notes that stay just yours — never shared."
        />
      </div>
    </section>
  );
}

function ArtifactCard({
  href,
  icon: Icon,
  title,
  count,
  description,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  count: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-card-border bg-card-bg p-5 transition hover:border-accent-300 hover:bg-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-50 text-accent-700">
          <Icon size={16} strokeWidth={1.5} />
        </span>
        <ChevronRight
          size={16}
          strokeWidth={1.5}
          className="text-text-tertiary transition group-hover:translate-x-0.5 group-hover:text-text-primary"
        />
      </div>
      <h3 className="mt-3.5 text-sm font-semibold text-text-primary">{title}</h3>
      <p className="mt-0.5 text-xs font-medium tabular-nums text-text-secondary">{count}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-text-tertiary">{description}</p>
    </Link>
  );
}
