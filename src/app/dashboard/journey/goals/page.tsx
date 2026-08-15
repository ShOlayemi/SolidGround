// ──────────────────────────────────────────────────────────────
// SolidGround AI — Shared Goals (/dashboard/journey/goals)
// ──────────────────────────────────────────────────────────────
// Server component: resolves the active pairing via getJourneyDashboard()
// (reused — never re-implemented), then loads the pairing's goals with
// listGoals() and hands them to the GoalsClient surface. No pairing →
// JourneyEmptyState (same pattern as the dashboard). Auth is handled by the
// dashboard layout. Journey is FREE (owner decision) — no premium gating.
// ──────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import { getJourneyDashboard, listGoals } from "@/lib/journey/actions";
import { JourneyEmptyState } from "@/components/journey/JourneyEmptyState";
import { JourneyErrorState } from "@/components/journey/JourneyErrorState";
import { JourneyPageHeader } from "@/components/journey/JourneyPageHeader";
import { GoalsClient } from "@/components/journey/GoalsClient";

export const metadata: Metadata = {
  title: "Shared Goals",
  description: "Goals you're working toward together with your partner.",
};

export default async function JourneyGoalsPage() {
  const dashboard = await getJourneyDashboard();
  if (!dashboard.ok) {
    return <JourneyErrorState message={dashboard.error ?? "Please try again in a moment."} />;
  }
  if (!dashboard.data.hasPairing) {
    return <JourneyEmptyState />;
  }

  const goalsResult = await listGoals(dashboard.data.pairingId);
  if (!goalsResult.ok) {
    return <JourneyErrorState message={goalsResult.error ?? "Please try again in a moment."} />;
  }

  const { goals } = dashboard.data;
  const count =
    goals.length === 0 ? "No goals yet" : `${goals.length} shared goal${goals.length === 1 ? "" : "s"}`;

  return (
    <div className="mx-auto max-w-[960px]">
      <JourneyPageHeader
        title="Shared goals"
        subtitle="Work toward what you both want — together."
        count={count}
      />
      <div className="mt-8">
        <GoalsClient pairingId={dashboard.data.pairingId} initialGoals={goalsResult.data} />
      </div>
    </div>
  );
}
