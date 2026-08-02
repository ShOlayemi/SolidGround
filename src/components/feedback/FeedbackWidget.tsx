"use client";

// ──────────────────────────────────────────────────────────────
// SolidGround AI — Feedback Widget
// Floating button (bottom-right) that opens a slide-out panel with
// Bug Report / Feature Request / General Feedback tabs.
// ──────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import {
  Bug,
  CheckCircle2,
  Lightbulb,
  Loader2,
  MessageSquare,
  MessageSquareText,
  Send,
  Star,
  X,
} from "lucide-react";
import {
  submitFeedback,
  type FeedbackType,
} from "@/lib/feedback/actions";
import { FEEDBACK_OPEN_EVENT } from "@/lib/feedback/open";

type WidgetTab = Extract<FeedbackType, "bug" | "feature" | "general">;

const TABS: { id: WidgetTab; label: string; icon: typeof Bug }[] = [
  { id: "bug", label: "Bug Report", icon: Bug },
  { id: "feature", label: "Feature Request", icon: Lightbulb },
  { id: "general", label: "General Feedback", icon: MessageSquare },
];

const TAB_DESCRIPTIONS: Record<WidgetTab, string> = {
  bug: "Something isn't working as expected? Tell us what happened.",
  feature: "Have an idea that would make SolidGround better?",
  general: "Share your thoughts, praise, or suggestions.",
};

interface FeedbackWidgetProps {
  userId: string;
}

function collectMetadata(): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  return {
    user_agent: navigator.userAgent,
    page_url: window.location.href,
    pathname: window.location.pathname,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    locale: navigator.language,
    platform: navigator.platform,
    widget: "feedback-widget",
  };
}

export function FeedbackWidget({ userId }: FeedbackWidgetProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<WidgetTab>("general");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Open when any page dispatches the open-feedback event
  useEffect(() => {
    const listener = () => setOpen(true);
    window.addEventListener(FEEDBACK_OPEN_EVENT, listener);
    return () => window.removeEventListener(FEEDBACK_OPEN_EVENT, listener);
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  function resetForm() {
    setTitle("");
    setDescription("");
    setRating(0);
    setTab("general");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() && !description.trim()) {
      showToast("Please add a title or a description.");
      return;
    }
    setSubmitting(true);
    const result = await submitFeedback(
      userId,
      tab,
      title.trim(),
      description.trim(),
      rating > 0 ? rating : null,
      collectMetadata(),
    );
    setSubmitting(false);
    if (result.success) {
      resetForm();
      showToast("Thanks! Your feedback has been submitted.");
      setOpen(false);
    } else {
      showToast(result.error ?? "Something went wrong. Please try again.");
    }
  }

  return (
    <>
      {/* Floating action button */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Close feedback" : "Send feedback"}
        aria-expanded={open}
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-accent-600 text-white shadow-lg transition hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-500/40"
      >
        {open ? (
          <X size={20} strokeWidth={1.8} />
        ) : (
          <MessageSquareText size={20} strokeWidth={1.8} />
        )}
      </button>

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-20 right-5 z-50 flex max-w-[320px] items-start gap-2 rounded-lg border border-card-border bg-card-bg px-4 py-3 text-[13px] text-text-primary shadow-xl"
        >
          {toast.startsWith("Thanks") ? (
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />
          ) : (
            <MessageSquare size={16} className="mt-0.5 shrink-0 text-amber-500" />
          )}
          <span>{toast}</span>
        </div>
      )}

      {/* Slide-out panel */}
      <div
        role="dialog"
        aria-label="Send feedback"
        aria-hidden={!open}
        className={clsx(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-[400px] flex-col bg-card-bg shadow-2xl transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-card-border px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-text-primary">
              Send feedback
            </h2>
            <p className="mt-0.5 text-xs text-text-tertiary">
              Help us make SolidGround better.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="rounded-md p-1.5 text-text-tertiary transition hover:bg-card-hover hover:text-text-primary"
          >
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-card-border px-3 py-2">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-pressed={tab === id}
              className={clsx(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition",
                tab === id
                  ? "bg-accent-50 text-accent-700"
                  : "text-text-secondary hover:bg-card-hover hover:text-text-primary",
              )}
            >
              <Icon size={14} strokeWidth={1.8} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col gap-4 overflow-y-auto p-5"
        >
          <p className="text-[13px] text-text-secondary">
            {TAB_DESCRIPTIONS[tab]}
          </p>

          <div>
            <label
              htmlFor="feedback-title"
              className="mb-1.5 block text-[13px] font-medium text-text-primary"
            >
              Title
            </label>
            <input
              id="feedback-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Short summary"
              className="w-full rounded-lg border border-card-border bg-card-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
            />
          </div>

          <div>
            <label
              htmlFor="feedback-description"
              className="mb-1.5 block text-[13px] font-medium text-text-primary"
            >
              Description
            </label>
            <textarea
              id="feedback-description"
              rows={5}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={
                tab === "bug"
                  ? "What happened? What did you expect instead?"
                  : "Tell us more…"
              }
              className="w-full resize-y rounded-lg border border-card-border bg-card-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
            />
          </div>

          <div>
            <span className="mb-1.5 block text-[13px] font-medium text-text-primary">
              Rating <span className="font-normal text-text-tertiary">(optional)</span>
            </span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating((current) => (current === star ? 0 : star))}
                  aria-label={`${star} star${star > 1 ? "s" : ""}`}
                  className="rounded-md p-1 transition hover:bg-card-hover"
                >
                  <Star
                    size={20}
                    strokeWidth={1.5}
                    className={
                      star <= rating
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-300"
                    }
                  />
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg bg-accent-600 px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-500/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 size={15} strokeWidth={1.8} className="animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                <Send size={15} strokeWidth={1.8} />
                Submit feedback
              </>
            )}
          </button>
        </form>
      </div>
    </>
  );
}
