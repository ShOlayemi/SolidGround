import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * SolidGround AI — Journey sub-page header.
 *
 * Shared chrome for the goals / agreements / reflections screens: a
 * "Back to Journey" link, the page title, subtitle, and an optional count
 * badge. Pure presentational (no hooks) — renders from server components.
 */
export function JourneyPageHeader({
  title,
  subtitle,
  count,
}: {
  title: string;
  subtitle: string;
  count?: string;
}) {
  return (
    <header>
      <Link
        href="/dashboard/journey"
        className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-text-secondary transition hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
      >
        <ArrowLeft size={15} />
        Back to Journey
      </Link>
      <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">{title}</h1>
        {count ? (
          <span className="text-sm tabular-nums text-text-tertiary">{count}</span>
        ) : null}
      </div>
      <p className="mt-1.5 text-text-secondary">{subtitle}</p>
    </header>
  );
}
