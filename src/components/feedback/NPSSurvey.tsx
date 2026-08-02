"use client";

// ──────────────────────────────────────────────────────────────
// SolidGround AI — NPS Survey
// "How likely are you to recommend SolidGround to a friend?" (0-10)
// Shown once per user (server-side eligibility) and dismissible.
// ──────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Heart, Loader2, X } from "lucide-react";
import { submitFeedback } from "@/lib/feedback/actions";

const NPS_DISMISS_KEY = "solidground.nps.dismissed";

function scoreLabel(score: number): string {
  if (score >= 9) return "Promoter";
  if (score >= 7) return "Passive";
  return "Detractor";
}

interface NPSSurveyProps {
  userId: string;
  /** Server-side eligibility: user has never submitted an NPS response. */
  eligible: boolean;
  /** Where the survey was triggered: right after assessment completion or 3rd visit. */
  source: "assessment" | "visit";
  /** Called when the user dismisses the survey without submitting. */
  onClose?: () => void;
  /** Called after a successful submission. */
  onSubmitted?: () => void;
}

export function NPSSurvey({
  userId,
  eligible,
  source,
  onClose,
  onSubmitted,
}: NPSSurveyProps) {
  const [visible, setVisible] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!eligible) return;
    if (
      typeof window !== "undefined" &&
      window.localStorage.getItem(NPS_DISMISS_KEY) === "1"
    ) {
      return;
    }
    setVisible(true);
  }, [eligible]);

  function dismiss() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(NPS_DISMISS_KEY, "1");
    }
    setVisible(false);
    onClose?.();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (score === null || submitting) return;
    setSubmitting(true);
    const result = await submitFeedback(
      userId,
      "nps",
      `NPS response (${score}/10)`,
      reason.trim(),
      score,
      { source, survey: "nps" },
    );
    setSubmitting(false);
    if (result.success) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(NPS_DISMISS_KEY, "1");
      }
      setSubmitted(true);
      onSubmitted?.();
    }
  }

  if (submitted) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-card-border bg-card-bg p-5 shadow-sm">
        <Heart size={20} strokeWidth={1.6} className="mt-0.5 shrink-0 text-accent-600" />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-text-primary">
            Thank you for your feedback!
          </p>
          <p className="mt-0.5 text-[13px] text-text-secondary">
            Your response helps us make SolidGround better for everyone.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="rounded-md p-1 text-text-tertiary transition hover:bg-card-hover hover:text-text-primary"
        >
          <X size={16} strokeWidth={1.8} />
        </button>
      </div>
    );
  }

  if (!visible) return null;

  return (
    <div className="rounded-xl border border-card-border bg-card-bg p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[15px] font-semibold text-text-primary">
            How likely are you to recommend SolidGround to a friend?
          </h3>
          <p className="mt-1 text-[13px] text-text-secondary">
            0 = Not at all likely · 10 = Extremely likely
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss survey"
          className="rounded-md p-1 text-text-tertiary transition hover:bg-card-hover hover:text-text-primary"
        >
          <X size={16} strokeWidth={1.8} />
        </button>
      </div>

      {/* 0-10 scale */}
      <div className="mt-4 flex gap-1">
        {Array.from({ length: 11 }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setScore(i)}
            aria-label={`${i} — ${scoreLabel(i)}`}
            aria-pressed={score === i}
            className={clsx(
              "h-9 flex-1 rounded-md text-[13px] font-medium tabular-nums transition",
              score === i
                ? "bg-accent-600 text-white"
                : "bg-card-hover text-text-secondary hover:bg-accent-100 hover:text-accent-700",
            )}
          >
            {i}
          </button>
        ))}
      </div>

      {/* Follow-up */}
      {score !== null && (
        <form onSubmit={handleSubmit} className="mt-4">
          <label
            htmlFor="nps-reason"
            className="mb-1.5 block text-[13px] font-medium text-text-primary"
          >
            What&apos;s the main reason for your score?{" "}
            <span className="font-normal text-text-tertiary">(optional)</span>
          </label>
          <textarea
            id="nps-reason"
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Tell us what influenced your rating…"
            className="w-full resize-y rounded-lg border border-card-border bg-card-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-text-tertiary">
              You selected <span className="font-medium text-text-secondary">{score}</span> —{" "}
              {scoreLabel(score)}
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent-600 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-500/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 size={15} strokeWidth={1.8} className="animate-spin" />
                  Submitting…
                </>
              ) : (
                "Submit"
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
