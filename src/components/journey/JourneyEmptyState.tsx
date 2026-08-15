import Link from "next/link";
import { Route } from "lucide-react";

/**
 * SolidGround AI — Journey empty state (no active pairing yet).
 *
 * Rendered when getJourneyDashboard() returns { hasPairing: false }. Warm
 * and honest: the Journey is a post-pairing product, so we point the user at
 * the two steps that unlock it — completing their Compatibility Blueprint™
 * (the pairings page gates pairing behind a completed session) and pairing
 * with a partner.
 */
export function JourneyEmptyState() {
  return (
    <div className="mx-auto max-w-[640px]">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary">Journey</h1>
        <p className="mt-2 text-text-secondary">
          A shared space to grow your relationship on purpose.
        </p>
      </header>

      <div className="rounded-2xl border border-card-border bg-card-bg px-6 py-12 text-center md:px-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-100 text-accent-700">
          <Route size={24} strokeWidth={1.5} />
        </div>
        <h2 className="mt-5 text-xl font-semibold text-text-primary">Journey unlocks after you pair</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-secondary">
          Once you and your partner have both completed your Compatibility Blueprints™, the
          Journey opens up: conversation topics drawn from your Alignment Match™, shared goals,
          agreements, and private reflections — a shared space to grow together on purpose.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/dashboard/pairings"
            className="inline-flex items-center gap-2 rounded-lg bg-accent-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
          >
            Pair with a partner
          </Link>
          <Link
            href="/dashboard/blueprint"
            className="inline-flex items-center gap-2 rounded-lg border border-card-border bg-card-bg px-5 py-2.5 text-sm font-medium text-text-secondary transition hover:border-accent-300 hover:bg-card-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
          >
            Complete your Blueprint
          </Link>
        </div>
        <p className="mt-6 text-xs leading-relaxed text-text-tertiary">
          Not paired yet? Complete your Compatibility Blueprint™ first — pairing unlocks once
          your profile is ready.
        </p>
      </div>
    </div>
  );
}
