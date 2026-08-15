"use client";

// ──────────────────────────────────────────────────────────────
// SolidGround AI — Private reflections screen (/dashboard/journey/reflections)
// ──────────────────────────────────────────────────────────────
// Owner-only list of the user's private reflections. Data is loaded
// server-side (getJourneyDashboard + listReflections) and passed in; every
// mutation goes through the server actions — never Supabase directly.
//
// Privacy rule (owner directive): reflections are owner-only. The partner
// never sees them, and they are NEVER sent to any coach provider. The UI
// makes this explicit with the lock banner and per-card treatment.
//
// Interactions:
//  - "New reflection" opens the inline ReflectionForm (content + optional
//    topic/area link); Edit re-opens it prefilled (content only).
//  - Delete is a two-step inline confirm.
// ──────────────────────────────────────────────────────────────

import { useState } from "react";
import { Lock, Pencil, Plus } from "lucide-react";
import { deleteReflection } from "@/lib/journey/actions";
import { domainLabel } from "@/lib/journey/display";
import { formatGoalDate } from "@/lib/journey/dates";
import type { JourneyTopic, PrivateReflection } from "@/lib/journey/types";
import { ReflectionForm } from "./ReflectionForm";
import { ConfirmDeleteButton } from "./ConfirmDeleteButton";

export function ReflectionsClient({
  pairingId,
  initialReflections,
  topics,
}: {
  /** The active pairing — new reflections are tied to it (optional link columns). */
  pairingId: string;
  initialReflections: PrivateReflection[];
  /** The pairing's journey topics — lets the list name linked topics. */
  topics: JourneyTopic[];
}) {
  const [reflections, setReflections] = useState<PrivateReflection[]>(initialReflections);
  const [formOpen, setFormOpen] = useState(false);
  const [editingReflection, setEditingReflection] = useState<PrivateReflection | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const topicById = new Map(topics.map((topic) => [topic.id, topic]));

  function openCreate() {
    setEditingReflection(null);
    setActionError(null);
    setFormOpen(true);
  }

  function openEdit(reflection: PrivateReflection) {
    setEditingReflection(reflection);
    setActionError(null);
    setFormOpen(true);
  }

  function onSaved(saved: PrivateReflection) {
    setReflections((prev) => {
      const exists = prev.some((r) => r.id === saved.id);
      return exists ? prev.map((r) => (r.id === saved.id ? saved : r)) : [saved, ...prev];
    });
    setFormOpen(false);
    setEditingReflection(null);
  }

  async function remove(reflection: PrivateReflection) {
    setBusyId(reflection.id);
    setActionError(null);
    try {
      const result = await deleteReflection(reflection.id);
      if (!result.ok) {
        setActionError(result.error ?? "Failed to delete this reflection. Please try again.");
        return;
      }
      setReflections((prev) => prev.filter((r) => r.id !== reflection.id));
    } catch {
      setActionError("Failed to delete this reflection. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-[760px]">
      {/* Privacy banner — the surface's most important message. */}
      <div className="mb-6 flex items-start gap-2.5 rounded-xl bg-slate-100 px-4 py-3">
        <Lock size={15} strokeWidth={1.5} className="mt-0.5 shrink-0 text-text-tertiary" />
        <p className="text-xs leading-relaxed text-text-secondary">
          Only you can see your reflections — not your partner, not the AI coach. They&apos;re
          yours to keep private, forever.
        </p>
      </div>

      {actionError ? (
        <div role="alert" className="mb-5 rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {actionError}
        </div>
      ) : null}

      {formOpen ? (
        <div className="mb-6">
          <ReflectionForm
            pairingId={pairingId}
            topics={topics}
            reflection={editingReflection}
            onSaved={onSaved}
            onCancel={() => {
              setFormOpen(false);
              setEditingReflection(null);
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
          New reflection
        </button>
      )}

      {reflections.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-card-border bg-card-bg p-8 text-center text-sm text-text-secondary">
          No private reflections yet — jot down what&apos;s on your mind as you work through your
          Journey topics. Only you will ever see it.
        </p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {reflections.map((reflection) => {
            const topic = reflection.topicId ? topicById.get(reflection.topicId) : undefined;
            const category = domainLabel(reflection.categoryId);
            return (
              <li
                key={reflection.id}
                className="rounded-xl border border-card-border bg-card-bg px-4 py-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {topic ? (
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-accent-700">
                        {topic.categoryName} — {topic.topic}
                      </p>
                    ) : category ? (
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-accent-700">
                        {category}
                      </p>
                    ) : null}
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-text-primary">
                      {reflection.content}
                    </p>
                    <p className="mt-2 text-xs tabular-nums text-text-tertiary">
                      {formatGoalDate(reflection.createdAt)}
                    </p>
                  </div>

                  <span className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(reflection)}
                      disabled={busyId !== null}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-secondary transition hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Pencil size={13} />
                      Edit
                    </button>
                    <ConfirmDeleteButton
                      label="Delete"
                      onDelete={() => remove(reflection)}
                      busy={busyId === reflection.id}
                    />
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
