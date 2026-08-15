"use client";

// ──────────────────────────────────────────────────────────────
// SolidGround AI — Shared agreement editor (create + edit)
// ──────────────────────────────────────────────────────────────
// Inline form card rendered by AgreementsClient. Title is required;
// description/domain are optional. Status always starts 'pending' on create
// (server-enforced); status changes happen from the list via
// setAgreementStatus — this form never touches status.
// All data access goes through createAgreement / updateAgreement.
// ──────────────────────────────────────────────────────────────

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createAgreement, updateAgreement } from "@/lib/journey/actions";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/assessment/questions";
import type { SharedAgreement } from "@/lib/journey/types";

/** Sentinel select value for "no domain" (the column is nullable). */
const DOMAIN_NONE = "none";

const DOMAIN_OPTIONS: Array<{ value: string; label: string }> = [
  ...CATEGORY_ORDER.map((id) => ({ value: id, label: CATEGORY_LABELS[id] })),
  { value: DOMAIN_NONE, label: "No area" },
];

const inputClass =
  "w-full rounded-lg border border-card-border bg-card-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20";
const labelClass = "mb-1.5 block text-sm font-medium text-text-secondary";

export function AgreementForm({
  pairingId,
  agreement,
  onSaved,
  onCancel,
}: {
  pairingId: string;
  /** When provided the form edits this agreement; otherwise it creates a new one. */
  agreement: SharedAgreement | null;
  onSaved: (saved: SharedAgreement) => void;
  onCancel: () => void;
}) {
  const editing = agreement !== null;

  const [title, setTitle] = useState(agreement?.title ?? "");
  const [description, setDescription] = useState(agreement?.description ?? "");
  const [domain, setDomain] = useState<string | null>(agreement?.domain ?? null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (saving) return;

    const trimmedTitle = title.trim();
    if (trimmedTitle.length === 0) {
      setTitleError("Give your agreement a title.");
      return;
    }
    setTitleError(null);
    setSaveError(null);
    setSaving(true);

    const payload = {
      title: trimmedTitle,
      description: description.trim().length > 0 ? description.trim() : null,
      domain: domain ?? null,
    };

    try {
      const result = editing && agreement
        ? await updateAgreement(agreement.id, payload)
        : await createAgreement({ pairingId, ...payload });
      if (!result.ok) {
        setSaveError(result.error ?? "Failed to save this agreement. Please try again.");
        return;
      }
      onSaved(result.data);
    } catch {
      setSaveError("Failed to save this agreement. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-card-border bg-card-bg p-5">
      <h2 className="text-sm font-semibold text-text-primary">
        {editing ? "Edit shared agreement" : "New shared agreement"}
      </h2>
      <p className="mt-0.5 text-xs text-text-secondary">
        A decision you&apos;re both committing to — visible to both of you.
      </p>

      {saveError ? (
        <div role="alert" className="mt-4 rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-xs text-danger-700">
          {saveError}
        </div>
      ) : null}

      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor="agreement-title" className={labelClass}>
            Title <span className="text-danger-500">*</span>
          </label>
          <input
            id="agreement-title"
            type="text"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              if (titleError) setTitleError(null);
            }}
            placeholder="e.g. Weekly money check-in"
            className={inputClass}
            aria-invalid={titleError !== null}
          />
          {titleError ? <p className="mt-1.5 text-xs text-danger-600">{titleError}</p> : null}
        </div>

        <div>
          <label htmlFor="agreement-domain" className={labelClass}>
            Area (optional)
          </label>
          <select
            id="agreement-domain"
            value={domain ?? DOMAIN_NONE}
            onChange={(event) => setDomain(event.target.value === DOMAIN_NONE ? null : event.target.value)}
            className={inputClass}
          >
            {DOMAIN_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="agreement-description" className={labelClass}>
            Description (optional)
          </label>
          <textarea
            id="agreement-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What does agreeing on this mean for both of you?"
            rows={3}
            className={`${inputClass} resize-y`}
          />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : null}
          {editing ? "Save changes" : "Create agreement"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
