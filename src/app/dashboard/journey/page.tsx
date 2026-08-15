// ──────────────────────────────────────────────────────────────
// SolidGround AI — Journey Dashboard (/dashboard/journey)
// ──────────────────────────────────────────────────────────────
// Server component: loads the Journey aggregate via getJourneyDashboard()
// and renders either the empty state (no active pairing) or the paired
// dashboard. Auth is handled by the dashboard layout. The Journey is FREE
// (owner decision) — no premium gating. No client interactivity needed on
// this page, so it stays a pure server component per architecture rules;
// the topic detail route hosts the only client surface (status toggle).
// ──────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import { getJourneyDashboard } from "@/lib/journey/actions";
import { JourneyEmptyState } from "@/components/journey/JourneyEmptyState";
import { JourneyDashboardView } from "@/components/journey/JourneyDashboardView";

export const metadata: Metadata = {
  title: "Journey",
  description: "Your shared growth plan — conversation topics, goals, and agreements with your partner.",
};

export default async function JourneyDashboardPage() {
  const result = await getJourneyDashboard();

  if (!result.ok) {
    return (
      <div className="mx-auto max-w-[760px]">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-text-primary">Journey</h1>
          <p className="mt-2 text-text-secondary">Your shared growth plan with your partner.</p>
        </header>
        <div className="rounded-2xl border border-card-border bg-card-bg p-12 text-center">
          <h2 className="text-xl font-semibold text-text-primary">Couldn&apos;t load your Journey</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-secondary">
            {result.error ?? "Please try again in a moment."}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!result.data.hasPairing) {
    return <JourneyEmptyState />;
  }

  return <JourneyDashboardView dashboard={result.data} />;
}
