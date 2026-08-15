"use client";

// ──────────────────────────────────────────────────────────────
// SolidGround AI — Journey Topic Detail (client surface)
// ──────────────────────────────────────────────────────────────
// Client surface for /dashboard/journey/topics/[topicId]. The topic is
// loaded server-side (getTopic) and passed in; the only mutation is the
// status toggle, which goes through setTopicStatus — never Supabase
// directly.
//
// Behavior (mirrors the mobile topic screen):
//  - Optimistic status toggle: the pill + button flip immediately, a subtle
//    "Saved" state confirms success, and the previous status is restored
//    with an inline error when the action returns ok:false.
//  - Prompts render verbatim from the report, numbered.
//  - A short note that the topic and its status are visible to both
//    partners.
// ──────────────────────────────────────────────────────────────

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Loader2, Users } from "lucide-react";
import { setTopicStatus } from "@/lib/journey/actions";
import type { JourneyTopic, TopicStatus } from "@/lib/journey/types";
import { TopicStatusPill } from "./TopicStatusPill";

interface TopicDetailClientProps {
  topic: JourneyTopic;
}

export function TopicDetailClient({ topic }: TopicDetailClientProps) {
  const [status, setStatus] = useState<TopicStatus>(topic.status);
  const [toggling, setToggling] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const discussed = status === "discussed";

  async function toggleStatus() {
    if (toggling) return;
    const next: TopicStatus = discussed ? "not_started" : "discussed";
    const previous = status;
    // Optimistic — flip immediately; revert on ok:false.
    setStatus(next);
    setToggleError(null);
    setSaved(false);
    setToggling(true);
    try {
      const result = await setTopicStatus(topic.id, next);
      if (!result.ok) {
        setStatus(previous);
        setToggleError(result.error ?? "Failed to update this topic. Please try again.");
        return;
      }
      setSaved(true);
      // Subtle saved state — clears after a moment (handler timer, not
      // render-scope work, so react-hooks/purity stays happy).
      window.setTimeout(() => setSaved(false), 2500);
    } catch {
      setStatus(previous);
      setToggleError("Failed to update this topic. Please try again.");
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className="mx-auto max-w-[760px]">
      <Link
        href="/dashboard/journey"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded-md"
      >
        <ArrowLeft size={15} />
        Back to Journey
      </Link>

      {/* ── Topic header ─────────────────────────────────── */}
      <header className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-700">{topic.categoryName}</p>
        <h1 className="mt-1.5 text-2xl font-semibold leading-snug tracking-tight text-text-primary">
          {topic.topic}
        </h1>
        <div className="mt-3 flex items-center gap-3">
          <TopicStatusPill status={status} />
          {saved ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600" role="status">
              <Check size={13} /> Saved
            </span>
          ) : null}
        </div>
      </header>

      {toggleError ? (
        <div role="alert" className="mt-5 rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {toggleError}
        </div>
      ) : null}

      {/* ── Status toggle ────────────────────────────────── */}
      <div className="mt-6">
        {discussed ? (
          <button
            type="button"
            onClick={() => void toggleStatus()}
            disabled={toggling}
            className="inline-flex items-center gap-2 rounded-lg border border-card-border bg-card-bg px-4 py-2.5 text-sm font-medium text-text-secondary transition hover:border-accent-300 hover:bg-card-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {toggling ? <Loader2 size={15} className="animate-spin" /> : null}
            Mark as not started
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void toggleStatus()}
            disabled={toggling}
            className="inline-flex items-center gap-2 rounded-lg bg-accent-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {toggling ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            Mark as discussed
          </button>
        )}
      </div>

      {/* ── Questions to discuss — the report's prompts, verbatim ── */}
      <section className="mt-10" aria-label="Questions to discuss">
        <h2 className="text-base font-semibold text-text-primary">Questions to discuss</h2>
        <p className="mt-1 text-sm text-text-secondary">Start here — take them one at a time.</p>
        {topic.prompts.length > 0 ? (
          <ol className="mt-4 space-y-3">
            {topic.prompts.map((prompt, index) => (
              <li
                key={`${index}-${prompt}`}
                className="flex gap-3 rounded-xl border border-card-border bg-card-bg px-4 py-3.5"
              >
                <span className="mt-0.5 shrink-0 text-sm font-semibold tabular-nums text-accent-700">
                  {index + 1}.
                </span>
                <p className="text-sm leading-relaxed text-text-primary">{prompt}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-card-border bg-card-bg p-8 text-center text-sm text-text-secondary">
            No prompts for this topic yet.
          </p>
        )}
      </section>

      {/* ── Shared-with-partner note ─────────────────────── */}
      <p className="mt-8 flex items-start gap-2 rounded-xl bg-slate-100 px-4 py-3 text-xs leading-relaxed text-text-secondary">
        <Users size={14} strokeWidth={1.5} className="mt-0.5 shrink-0 text-text-tertiary" />
        <span>
          This topic is shared with your partner — both of you can see it, its prompts, and whether
          it&apos;s marked as discussed.
        </span>
      </p>
    </div>
  );
}
