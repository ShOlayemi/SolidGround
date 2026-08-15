"use client";

// ──────────────────────────────────────────────────────────────
// SolidGround AI — Shared goals screen (/dashboard/journey/goals)
// ──────────────────────────────────────────────────────────────
// Client surface for the shared-goals list. Data is loaded server-side
// (getJourneyDashboard + listGoals) and passed in; every mutation goes
// through the server actions — never Supabase directly.
//
// Interactions (mirror the mobile goals surface):
//  - "New goal" opens the inline GoalForm (create); Edit re-opens it prefilled.
//  - Status changes (not_started → in_progress → completed) are optimistic —
//    the card flips immediately and reverts with an inline error on ok:false.
//  - Delete is a two-step inline confirm (ConfirmDeleteButton).
// Both partners can create/update/delete per migration 035 RLS.
// ──────────────────────────────────────────────────────────────

import { useState } from "react";
import { CalendarDays, Pencil, Plus } from "lucide-react";
import { deleteGoal, updateGoal } from "@/lib/journey/actions";
import { GOAL_STATUS_LABEL, GOAL_STATUS_ORDER, domainLabel } from "@/lib/journey/display";
import { formatGoalDate } from "@/lib/journey/dates";
import type { GoalStatus, SharedGoal } from "@/lib/journey/types";
import { GoalForm } from "./GoalForm";
import { ConfirmDeleteButton } from "./ConfirmDeleteButton";

export function GoalsClient({
  pairingId,
  initialGoals,
}: {
  pairingId: string;
  initialGoals: SharedGoal[];
}) {
  const [goals, setGoals] = useState<SharedGoal[]>(initialGoals);
  const [formOpen, setFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SharedGoal | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function openCreate() {
    setEditingGoal(null);
    setActionError(null);
    setFormOpen(true);
  }

  function openEdit(goal: SharedGoal) {
    setEditingGoal(goal);
    setActionError(null);
    setFormOpen(true);
  }

  function onSaved(saved: SharedGoal) {
    setGoals((prev) => {
      const exists = prev.some((g) => g.id === saved.id);
      return exists ? prev.map((g) => (g.id === saved.id ? saved : g)) : [saved, ...prev];
    });
    setFormOpen(false);
    setEditingGoal(null);
  }

  /** Optimistic status change — flips immediately, reverts on ok:false. */
  async function changeStatus(goal: SharedGoal, next: GoalStatus) {
    if (busyId || next === goal.status) return;
    const previous = goal.status;
    setBusyId(goal.id);
    setActionError(null);
    setGoals((prev) => prev.map((g) => (g.id === goal.id ? { ...g, status: next } : g)));
    try {
      const result = await updateGoal(goal.id, { status: next });
      if (!result.ok) {
        setGoals((prev) => prev.map((g) => (g.id === goal.id ? { ...g, status: previous } : g)));
        setActionError(result.error ?? "Failed to update this goal. Please try again.");
        return;
      }
      setGoals((prev) => prev.map((g) => (g.id === goal.id ? result.data : g)));
    } catch {
      setGoals((prev) => prev.map((g) => (g.id === goal.id ? { ...g, status: previous } : g)));
      setActionError("Failed to update this goal. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(goal: SharedGoal) {
    setBusyId(goal.id);
    setActionError(null);
    try {
      const result = await deleteGoal(goal.id);
      if (!result.ok) {
        setActionError(result.error ?? "Failed to delete this goal. Please try again.");
        return;
      }
      setGoals((prev) => prev.filter((g) => g.id !== goal.id));
    } catch {
      setActionError("Failed to delete this goal. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-[760px]">
      {actionError ? (
        <div role="alert" className="mb-5 rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {actionError}
        </div>
      ) : null}

      {formOpen ? (
        <div className="mb-6">
          <GoalForm
            pairingId={pairingId}
            goal={editingGoal}
            onSaved={onSaved}
            onCancel={() => {
              setFormOpen(false);
              setEditingGoal(null);
            }}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg border border-card-border bg-card-bg px-4 py-2.5 text-sm font-medium text-text-secondary transition hover:border-accent-300 hover:bg-card-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
        >
          <Plus size={15} />
          New goal
        </button>
      )}

      {goals.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-card-border bg-card-bg p-8 text-center text-sm text-text-secondary">
          No shared goals yet — set one together to start working toward something specific.
        </p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {goals.map((goal) => (
            <li
              key={goal.id}
              className="rounded-xl border border-card-border bg-card-bg px-4 py-3.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {domainLabel(goal.domain) ? (
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-accent-700">
                      {domainLabel(goal.domain)}
                    </p>
                  ) : null}
                  <p className="mt-0.5 text-sm font-semibold text-text-primary">{goal.title}</p>
                  {goal.description ? (
                    <p className="mt-1 text-sm leading-relaxed text-text-secondary">{goal.description}</p>
                  ) : null}
                  {goal.targetDate ? (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-text-tertiary">
                      <CalendarDays size={13} strokeWidth={1.5} />
                      Target: {formatGoalDate(goal.targetDate)}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <label className="sr-only" htmlFor={`goal-status-${goal.id}`}>
                    Status
                  </label>
                  <select
                    id={`goal-status-${goal.id}`}
                    value={goal.status}
                    onChange={(event) => void changeStatus(goal, event.target.value as GoalStatus)}
                    disabled={busyId !== null}
                    className="cursor-pointer rounded-full border border-card-border bg-card-bg px-2.5 py-1 text-[11px] font-semibold text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {GOAL_STATUS_ORDER.map((status) => (
                      <option key={status} value={status}>
                        {GOAL_STATUS_LABEL[status]}
                      </option>
                    ))}
                  </select>
                  <span className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(goal)}
                      disabled={busyId !== null}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-secondary transition hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Pencil size={13} />
                      Edit
                    </button>
                    <ConfirmDeleteButton
                      label="Delete"
                      onDelete={() => remove(goal)}
                      busy={busyId === goal.id}
                    />
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 flex items-center gap-1.5 text-xs leading-relaxed text-text-tertiary">
        Goals are shared with your partner — both of you can see and update them.
      </p>
    </div>
  );
}
