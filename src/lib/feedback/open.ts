// Client-side helper to open the feedback widget from anywhere.
// The FeedbackWidget (mounted in the dashboard layout) listens for this
// custom event, so any page can trigger the slide-out panel without
// prop drilling through the layout tree.

export const FEEDBACK_OPEN_EVENT = "solidground:open-feedback";

export function openFeedbackWidget(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(FEEDBACK_OPEN_EVENT));
}
