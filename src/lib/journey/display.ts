/**
 * SolidGround AI — Journey display helpers (pure, UI-only).
 *
 * Tiny pure functions the dashboard/topic-detail UI uses so grouping and
 * derived counts stay consistent and unit-testable. No data access here —
 * the UI consumes the persisted server-action payloads via these helpers.
 */
import { CATEGORY_LABELS } from "@/lib/assessment/questions";
import type { AgreementStatus, GoalStatus, JourneyCounts, JourneyTopic } from "./types";

/** Topics still to discuss — derived from REAL counts, never invented. */
export function topicsRemaining(counts: JourneyCounts): number {
  return Math.max(0, counts.topicsTotal - counts.topicsDiscussed);
}

/** Goal lifecycle labels, in the goal form's display order. */
export const GOAL_STATUS_LABEL: Record<GoalStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
};

/** The three goal lifecycle statuses, in display order. */
export const GOAL_STATUS_ORDER: readonly GoalStatus[] = [
  "not_started",
  "in_progress",
  "completed",
];

/** Agreement lifecycle labels, in display order. */
export const AGREEMENT_STATUS_LABEL: Record<AgreementStatus, string> = {
  pending: "Pending",
  agreed: "Agreed",
};

/** The agreement lifecycle, in display order (pending → agreed). */
export const AGREEMENT_STATUS_ORDER: readonly AgreementStatus[] = ["pending", "agreed"];

/**
 * Renders a goal/agreement domain (one of the 12 Blueprint category ids) as
 * its canonical label, or null when the value is null/unknown. Safe for
 * display in both server and client components.
 */
export function domainLabel(domain: string | null | undefined): string | null {
  if (!domain) return null;
  return CATEGORY_LABELS[domain as keyof typeof CATEGORY_LABELS] ?? null;
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
