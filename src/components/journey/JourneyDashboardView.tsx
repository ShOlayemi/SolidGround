import type { JourneyDashboard } from "@/lib/journey/types";
import { JourneyProgressSummary } from "./JourneyProgressSummary";
import { JourneyTopicList } from "./JourneyTopicList";
import { JourneyComingSoonSection } from "./JourneyComingSoonSection";

/**
 * SolidGround AI — Journey dashboard (paired view).
 *
 * Server component composing the progress summary, the grouped topic list,
 * and the "coming next" placeholders from the getJourneyDashboard() payload.
 * No client interactivity on this page — every mutation lives on the topic
 * detail route, and server re-render on navigation keeps statuses fresh.
 */
export function JourneyDashboardView({ dashboard }: { dashboard: Extract<JourneyDashboard, { hasPairing: true }> }) {
  return (
    <div className="mx-auto max-w-[960px]">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary">Journey</h1>
        <p className="mt-2 text-text-secondary">
          Your shared growth plan — topics, goals, and agreements with your partner.
        </p>
      </header>

      <JourneyProgressSummary counts={dashboard.counts} />

      <div className="mt-10">
        <JourneyTopicList topics={dashboard.topics} />
      </div>

      <div className="mt-10">
        <JourneyComingSoonSection
          goals={dashboard.goals}
          agreements={dashboard.agreements}
          reflectionsCount={dashboard.reflections.length}
        />
      </div>
    </div>
  );
}
