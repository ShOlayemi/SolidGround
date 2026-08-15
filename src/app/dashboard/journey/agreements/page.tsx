// ──────────────────────────────────────────────────────────────
// SolidGround AI — Shared Agreements (/dashboard/journey/agreements)
// ──────────────────────────────────────────────────────────────
// Server component: resolves the active pairing via getJourneyDashboard()
// (reused — never re-implemented), then loads the pairing's agreements with
// listAgreements() and hands them to the AgreementsClient surface. No pairing
// → JourneyEmptyState (same pattern as the dashboard). Auth is handled by the
// dashboard layout. Journey is FREE (owner decision) — no premium gating.
// ──────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import { getJourneyDashboard, listAgreements } from "@/lib/journey/actions";
import { JourneyEmptyState } from "@/components/journey/JourneyEmptyState";
import { JourneyErrorState } from "@/components/journey/JourneyErrorState";
import { JourneyPageHeader } from "@/components/journey/JourneyPageHeader";
import { AgreementsClient } from "@/components/journey/AgreementsClient";

export const metadata: Metadata = {
  title: "Shared Agreements",
  description: "Decisions you've both committed to with your partner.",
};

export default async function JourneyAgreementsPage() {
  const dashboard = await getJourneyDashboard();
  if (!dashboard.ok) {
    return <JourneyErrorState message={dashboard.error ?? "Please try again in a moment."} />;
  }
  if (!dashboard.data.hasPairing) {
    return <JourneyEmptyState />;
  }

  const agreementsResult = await listAgreements(dashboard.data.pairingId);
  if (!agreementsResult.ok) {
    return <JourneyErrorState message={agreementsResult.error ?? "Please try again in a moment."} />;
  }

  const { agreements } = dashboard.data;
  const count =
    agreements.length === 0
      ? "No agreements yet"
      : `${agreements.length} shared agreement${agreements.length === 1 ? "" : "s"}`;

  return (
    <div className="mx-auto max-w-[960px]">
      <JourneyPageHeader
        title="Shared agreements"
        subtitle="Write down how you'll show up for each other — and mark it agreed when you're both aligned."
        count={count}
      />
      <div className="mt-8">
        <AgreementsClient pairingId={dashboard.data.pairingId} initialAgreements={agreementsResult.data} />
      </div>
    </div>
  );
}
