"use client";

// ──────────────────────────────────────────────────────────────
// SolidGround AI — Journey load-error state
// ──────────────────────────────────────────────────────────────
// Rendered when a Journey sub-page's server actions return { ok: false }.
// A small client component so Retry can call router.refresh() to re-run the
// server component (plain <button> event handlers cannot live in a server
// component).
// ──────────────────────────────────────────────────────────────

import { useRouter } from "next/navigation";
import { ArrowLeft, RotateCw } from "lucide-react";

export function JourneyErrorState({ message }: { message: string }) {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-[640px]">
      <div className="mt-20 rounded-2xl border border-card-border bg-card-bg px-6 py-12 text-center md:px-10">
        <h2 className="text-xl font-semibold text-text-primary">Couldn&apos;t load this page</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-secondary">
          {message}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => router.refresh()}
            className="inline-flex items-center gap-2 rounded-lg bg-accent-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
          >
            <RotateCw size={15} />
            Try again
          </button>
          <a
            href="/dashboard/journey"
            className="inline-flex items-center gap-2 rounded-lg border border-card-border bg-card-bg px-5 py-2.5 text-sm font-medium text-text-secondary transition hover:border-accent-300 hover:bg-card-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
          >
            <ArrowLeft size={15} />
            Back to Journey
          </a>
        </div>
      </div>
    </div>
  );
}
