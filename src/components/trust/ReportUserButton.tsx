"use client";
// ──────────────────────────────────────────────────────────────
// SolidGround AI — Report User button + inline form (client)
// ──────────────────────────────────────────────────────────────
// Understated "Report" link (not a primary action) that expands an inline
// form: a reason dropdown (the six migration-036 categories) + optional
// details textarea + submit. Calls the reportUser server action. On success
// it replaces the form with a confirmation message; on error it shows an
// inline error. Reports are private (RLS: reporter_user_id = me).
// ──────────────────────────────────────────────────────────────
import { useState, useTransition } from "react";
import { CheckCircle2, Flag, Loader2 } from "lucide-react";
import { reportUser } from "@/lib/trust/actions";
import { REPORT_CATEGORY_ORDER, REPORT_CATEGORY_LABELS } from "@/lib/trust/copy";

const DETAILS_MAX = 2000;

export function ReportUserButton({
  reportedUserId,
}: {
  /** The user being reported (may be null for non-user reports). */
  reportedUserId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setOpen(false);
    setReason("");
    setDetails("");
    setFieldError(null);
    setError(null);
    setDone(false);
  }

  function submit() {
    setFieldError(null);
    setError(null);
    if (!reason) {
      setFieldError("Choose a reason for the report.");
      return;
    }
    startTransition(async () => {
      const result = await reportUser({
        reportedUserId,
        reason: reason as Parameters<typeof reportUser>[0]["reason"],
        details,
      });
      if (result.ok) {
        setDone(true);
      } else {
        setError(result.error);
      }
    });
  }

  if (done) {
    return (
      <div
        className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-700"
        role="status"
      >
        <CheckCircle2 size={15} className="shrink-0" />
        Report submitted. We&apos;ll review it.
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] font-medium text-solid-text-tertiary transition hover:text-solid-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-solid-error/40"
      >
        <Flag size={14} strokeWidth={1.75} />
        Report
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-solid-border bg-solid-surface p-4">
      <p className="text-[13px] font-medium text-solid-text">
        Report this connection
      </p>
      <p className="mt-0.5 text-[12px] text-solid-text-secondary">
        Tell us what happened. Reports are private and reviewed by our team.
      </p>

      {error ? (
        <div
          role="alert"
          className="mt-3 rounded-lg border border-solid-error/30 bg-solid-error/[0.06] px-3 py-2 text-[13px] text-solid-error"
        >
          {error}
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        <div>
          <label
            htmlFor="report-reason"
            className="mb-1 block text-[12px] font-medium text-solid-text-secondary"
          >
            Reason
          </label>
          <select
            id="report-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-lg border border-solid-border bg-white px-3 py-2 text-[14px] text-solid-text focus:border-solid-accent focus:outline-none focus:ring-2 focus:ring-solid-accent/30"
          >
            <option value="" disabled>
              Select a reason…
            </option>
            {REPORT_CATEGORY_ORDER.map((value) => (
              <option key={value} value={value}>
                {REPORT_CATEGORY_LABELS[value]}
              </option>
            ))}
          </select>
          {fieldError ? (
            <p className="mt-1 text-[12px] text-solid-error">{fieldError}</p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="report-details"
            className="mb-1 block text-[12px] font-medium text-solid-text-secondary"
          >
            Details <span className="text-solid-text-tertiary">(optional)</span>
          </label>
          <textarea
            id="report-details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            maxLength={DETAILS_MAX}
            rows={4}
            placeholder="Share any details that might help us review this."
            className="w-full resize-y rounded-lg border border-solid-border bg-white px-3 py-2 text-[14px] text-solid-text focus:border-solid-accent focus:outline-none focus:ring-2 focus:ring-solid-accent/30"
          />
          <p className="mt-1 text-right text-[11px] text-solid-text-tertiary">
            {details.length}/{DETAILS_MAX}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-solid-error px-4 py-2 text-[13px] font-medium text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-solid-error/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : null}
          {isPending ? "Submitting…" : "Submit report"}
        </button>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center rounded-lg px-3 py-2 text-[13px] font-medium text-solid-text-secondary transition hover:text-solid-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-solid-accent/40"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
