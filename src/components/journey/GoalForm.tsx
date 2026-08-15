"use client";

// ──────────────────────────────────────────────────────────────
// SolidGround AI — Shared goal editor (create + edit)
// ──────────────────────────────────────────────────────────────
// Inline form card rendered by GoalsClient. Create mode starts a goal at
// 'not_started' (server-enforced); edit mode also exposes the status select.
// Title is required; description/domain/target date are optional. Target date
// is validated client-side (YYYY-MM-DD via parseGoalDate) before the action
// is called — the action stores the ISO string as-is.
// All data access goes through createGoal / updateGoal server actions.
// ──────────────────────────────────────────────────────────────

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createGoal, updateGoal } from "@/lib/journey/actions";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/assessment/questions";
import { GOAL_STATUS_LABEL, GOAL_STATUS_ORDER } from "@/lib/journey/display";
import { goalDateInputValue, parseGoalDate } from "@/lib/journey/dates";
import type { GoalStatus, SharedGoal } from "@/lib/journey/types";

/** Sentinel select value for "no domain" (the column is nullable). */
const DOMAIN_NONE = "none";

const DOMAIN_OPTIONS: Array<{ value: string; label: string }> = [
  ...CATEGORY_ORDER.map((id) => ({ value: id, label: CATEGORY_LABELS[id] })),
  { value: DOMAIN_NONE, label: "No area" },
];

const INVALID_DATE_MESSAGE = "Enter the date as YYYY-MM-DD, e.g. 2026-12-31.";

const inputClass =
  "w-full rounded-lg border border-card-border bg-card-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20";
const labelClass = "mb-1.5 block text-sm font-medium text-text-secondary";

export function GoalForm({
  pairingId,
  goal,
  onSaved,
  onCancel,
}: {
  pairingId: string;
  /** When provided the form edits this goal; otherwise it creates a new one. */
  goal: SharedGoal | null;
  onSaved: (saved: SharedGoal) => void;
  onCancel: () => void;
}) {
  const editing = goal !== null;

  const [title, setTitle] = useState(goal?.title ?? "");
  const [description, setDescription] = useState(goal?.description ?? "");
  const [domain, setDomain] = useState<string | null>(goal?.domain ?? null);
  const [dateInput, setDateInput] = useState(goalDateInputValue(goal?.targetDate));
  const [status, setStatus] = useState<GoalStatus>(goal?.status ?? "not_started");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (saving) return;

    const trimmedTitle = title.trim();
    if (trimmedTitle.length === 0) {
      setTitleError("Give your goal a title.");
      return;
    }
    setTitleError(null);

    const parsed = parseGoalDate(dateInput);
    if (!parsed.valid) {
      setDateError(INVALID_DATE_MESSAGE);
      return;
    }
    setDateError(null);
    setSaveError(null);
    setSaving(true);

    const payload = {
      title: trimmedTitle,
      description: description.trim().length > 0 ? description.trim() : null,
      domain: domain ?? null,
      targetDate: parsed.iso,
    };

    try {
      const result = editing && goal
        ? await updateGoal(goal.id, { ...payload, status })
        : await createGoal({ pairingId, ...payload });
      if (!result.ok) {
        setSaveError(result.error ?? "Failed to save this goal. Please try again.");
        return;
      }
      onSaved(result.data);
    } catch {
      setSaveError("Failed to save this goal. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-card-border bg-card-bg p-5">
      <h2 className="text-sm font-semibold text-text-primary">
        {editing ? "Edit shared goal" : "New shared goal"}
      </h2>
      <p className="mt-0.5 text-xs text-text-secondary">
        A goal you&apos;re working toward together — visible to both of you.
      </p>

      {saveError ? (
        <div role="alert" className="mt-4 rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-xs text-danger-700">
          {saveError}
        </div>
      ) : null}

      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor="goal-title" className={labelClass}>
            Title <span className="text-danger-500">*</span>
          </label>
          <input
            id="goal-title"
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
          <label htmlFor="goal-description" className={labelClass}>
            Description (optional)
          </label>
          <textarea
            id="goal-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What does done look like?"
            rows={3}
            className={`${inputClass} resize-y`}
          />
        </div>

        <div>
          <label htmlFor="goal-domain" className={labelClass}>
            Area (optional)
          </label>
          <select
            id="goal-domain"
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
          <label htmlFor="goal-target-date" className={labelClass}>
            Target date (optional)
          </label>
          <input
            id="goal-target-date"
            type="date"
            value={dateInput}
            onChange={(event) => {
              setDateInput(event.target.value);
              if (dateError) setDateError(null);
            }}
            className={inputClass}
            aria-invalid={dateError !== null}
          />
          {dateError ? <p className="mt-1.5 text-xs text-danger-600">{dateError}</p> : null}
        </div>

        {editing ? (
          <div>
            <label htmlFor="goal-status" className={labelClass}>
              Status
            </label>
            <select
              id="goal-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as GoalStatus)}
              className={inputClass}
            >
              {GOAL_STATUS_ORDER.map((option) => (
                <option key={option} value={option}>
                  {GOAL_STATUS_LABEL[option]}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : null}
          {editing ? "Save changes" : "Create goal"}
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
