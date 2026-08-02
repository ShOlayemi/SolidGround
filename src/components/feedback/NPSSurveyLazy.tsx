"use client";
// ──────────────────────────────────────────────────────────────
// SolidGround AI — NPS Survey (lazy)
// Client-only wrapper that code-splits the NPS survey out of the
// results page bundle. The survey is only shown once after
// assessment completion, so there is no need to ship it eagerly.
// ──────────────────────────────────────────────────────────────
import dynamic from "next/dynamic";

const NPSSurvey = dynamic(
  () => import("./NPSSurvey").then((m) => m.NPSSurvey),
  {
    ssr: false,
    loading: () => (
      <div
        aria-hidden="true"
        className="mx-auto w-full max-w-[520px] rounded-2xl border border-solid-border bg-solid-surface p-6"
      >
        <div className="mb-4 h-4 w-1/2 animate-pulse rounded bg-slate-200" />
        <div className="mb-6 h-3 w-3/4 animate-pulse rounded bg-slate-200" />
        <div className="flex justify-center gap-2">
          {Array.from({ length: 11 }, (_, i) => (
            <div key={i} className="h-9 w-8 animate-pulse rounded-lg bg-slate-200" />
          ))}
        </div>
        <div className="mt-6 h-10 w-full animate-pulse rounded-xl bg-slate-200" />
      </div>
    ),
  },
);

export function NPSSurveyLazy({
  userId,
  eligible,
  source,
  onClose,
  onSubmitted,
}: {
  userId: string;
  eligible: boolean;
  source: "assessment" | "visit";
  onClose?: () => void;
  onSubmitted?: () => void;
}) {
  return (
    <NPSSurvey
      userId={userId}
      eligible={eligible}
      source={source}
      onClose={onClose}
      onSubmitted={onSubmitted}
    />
  );
}
