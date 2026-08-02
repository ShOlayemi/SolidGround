// Feedback constants shared across server actions, components, and pages.
// Kept OUT of the "use server" file because Next.js requires server-action
// modules to export only async functions.

export type FeedbackType = "bug" | "feature" | "nps" | "general";
export type FeedbackStatus =
  | "new"
  | "reviewed"
  | "planned"
  | "in_progress"
  | "completed"
  | "declined";

export const FEEDBACK_TYPES: FeedbackType[] = [
  "bug",
  "feature",
  "nps",
  "general",
];

export const FEEDBACK_STATUSES: FeedbackStatus[] = [
  "new",
  "reviewed",
  "planned",
  "in_progress",
  "completed",
  "declined",
];
