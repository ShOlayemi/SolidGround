/**
 * SolidGround AI — Journey display helpers (pure, UI-only).
 *
 * Tiny pure functions the dashboard/topic-detail UI uses so grouping and
 * derived counts stay consistent and unit-testable. No data access here —
 * the UI consumes the persisted server-action payloads via these helpers.
 */
import type { JourneyCounts, JourneyTopic } from "./types";

/** Topics still to discuss — derived from REAL counts, never invented. */
export function topicsRemaining(counts: JourneyCounts): number {
  return Math.max(0, counts.topicsTotal - counts.topicsDiscussed);
}

/**
 * Groups topics by status, preserving the server's report order within each
 * group. Both keys are always present so the UI can render either section
 * conditionally without undefined checks.
 */
export function groupTopicsByStatus(topics: JourneyTopic[]): {
  notStarted: JourneyTopic[];
  discussed: JourneyTopic[];
} {
  const notStarted: JourneyTopic[] = [];
  const discussed: JourneyTopic[] = [];
  for (const topic of topics) {
    if (topic.status === "discussed") {
      discussed.push(topic);
    } else {
      notStarted.push(topic);
    }
  }
  return { notStarted, discussed };
}
