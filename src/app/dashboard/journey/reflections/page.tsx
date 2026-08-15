// ──────────────────────────────────────────────────────────────
// SolidGround AI — Private Reflections (/dashboard/journey/reflections)
// ──────────────────────────────────────────────────────────────
// Server component: resolves the active pairing via getJourneyDashboard()
// (reused — never re-implemented) — the pairing's topics are passed through
// so the form/list can name linked topics — then loads the user's OWN
// reflections with listReflections() (always session-scoped server-side).
// No pairing → JourneyEmptyState (same pattern as the dashboard), even though
// reflections are owner-only: the Journey is a post-pairing space and a new
// reflection is tied to the active pairing.
// Auth is handled by the dashboard layout. Journey is FREE (owner decision).
// ──────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import { getJourneyDashboard, listReflections } from "@/lib/journey/actions";
import { JourneyEmptyState } from "@/components/journey/JourneyEmptyState";
import { JourneyErrorState } from "@/components/journey/JourneyErrorState";
import { JourneyPageHeader } from "@/components/journey/JourneyPageHeader";
import { ReflectionsClient } from "@/components/journey/ReflectionsClient";

export const metadata: Metadata = {
  title: "Private Reflections",
  description: "Your private notes — only you can see them.",
};

export default async function JourneyReflectionsPage() {
  const dashboard = await getJourneyDashboard();
  if (!dashboard.ok) {
    return <JourneyErrorState message={dashboard.error ?? "Please try again in a moment."} />;
  }
  if (!dashboard.data.hasPairing) {
    return <JourneyEmptyState />;
  }

  const reflectionsResult = await listReflections();
  if (!reflectionsResult.ok) {
    return <JourneyErrorState message={reflectionsResult.error ?? "Please try again in a moment."} />;
  }

  const { reflections } = dashboard.data;
  const count =
    reflections.length === 0
      ? "No reflections yet"
      : `${reflections.length} private reflection${reflections.length === 1 ? "" : "s"}`;

  return (
    <div className="mx-auto max-w-[960px]">
      <JourneyPageHeader
        title="Private reflections"
        subtitle="Notes that stay just yours — a quiet space to think out loud."
        count={count}
      />
      <div className="mt-8">
        <ReflectionsClient
          pairingId={dashboard.data.pairingId}
          initialReflections={reflectionsResult.data}
          topics={dashboard.data.topics}
        />
      </div>
    </div>
  );
}
