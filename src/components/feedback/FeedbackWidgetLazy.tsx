"use client";
// ──────────────────────────────────────────────────────────────
// SolidGround AI — Feedback Widget (lazy)
// Client-only wrapper that code-splits the FeedbackWidget out of
// the initial dashboard bundle. The floating button is below the
// fold of user attention, so it loads asynchronously with a
// skeleton placeholder.
// ──────────────────────────────────────────────────────────────
import dynamic from "next/dynamic";

const FeedbackWidget = dynamic(
  () => import("./FeedbackWidget").then((m) => m.FeedbackWidget),
  {
    ssr: false,
    loading: () => (
      <div
        aria-hidden="true"
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 animate-pulse items-center justify-center rounded-full bg-slate-200"
      />
    ),
  },
);

export function FeedbackWidgetLazy({ userId }: { userId: string }) {
  return <FeedbackWidget userId={userId} />;
}
