"use client";
// ──────────────────────────────────────────────────────────────
// SolidGround AI — Blueprint Wizard (lazy)
// Client-only wrapper that code-splits the 88-question assessment
// wizard out of the initial assess-page bundle. The wizard is the
// heaviest client component in the app (question bank + scoring),
// so it loads asynchronously with a wizard-shaped skeleton while
// the page shell paints.
// ──────────────────────────────────────────────────────────────
import dynamic from "next/dynamic";
import type { AssessmentSession, AssessmentAnswer } from "@/types";

const BlueprintWizard = dynamic(
  () => import("./BlueprintWizard").then((m) => m.BlueprintWizard),
  {
    ssr: false,
    loading: () => (
      <div aria-hidden="true" className="w-full">
        {/* Progress bar placeholder */}
        <div className="mb-6 h-2 w-full animate-pulse rounded-full bg-slate-200" />
        {/* Category sidebar placeholder */}
        <div className="mb-6 space-y-2 md:w-48">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 w-40 animate-pulse rounded bg-slate-200" />
          ))}
        </div>
        {/* Question card placeholder */}
        <div className="rounded-2xl border border-solid-border bg-solid-surface p-6 md:p-10">
          <div className="mb-3 h-3 w-24 animate-pulse rounded bg-slate-200" />
          <div className="mb-6 h-5 w-3/4 animate-pulse rounded bg-slate-200" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 w-full animate-pulse rounded-xl bg-slate-200" />
            ))}
          </div>
          <div className="mt-8 flex justify-between">
            <div className="h-11 w-28 animate-pulse rounded-xl bg-slate-200" />
            <div className="h-11 w-28 animate-pulse rounded-xl bg-slate-200" />
          </div>
        </div>
      </div>
    ),
  },
);

export function BlueprintWizardLazy({
  session,
  initialAnswers,
}: {
  session: AssessmentSession;
  initialAnswers: AssessmentAnswer[];
}) {
  return <BlueprintWizard session={session} initialAnswers={initialAnswers} />;
}
