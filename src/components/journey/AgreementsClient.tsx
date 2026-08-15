"use client";

// ──────────────────────────────────────────────────────────────
// SolidGround AI — Shared agreements screen (/dashboard/journey/agreements)
// ──────────────────────────────────────────────────────────────
// Client surface for the shared-agreements list. Data is loaded server-side
// (getJourneyDashboard + listAgreements) and passed in; every mutation goes
// through the server actions — never Supabase directly.
//
// Interactions (mirror the mobile agreements surface):
//  - "New agreement" opens the inline AgreementForm; Edit re-opens it prefilled.
//  - The status toggle (pending ↔ agreed) via setAgreementStatus is
//    optimistic — the badge flips immediately and reverts on ok:false.
//  - Delete is a two-step inline confirm.
// Both partners can create/update/delete per migration 036 RLS.
// ──────────────────────────────────────────────────────────────

import { useState } from "react";
import { Check, Loader2, Pencil, Plus } from "lucide-react";
import { deleteAgreement, setAgreementStatus } from "@/lib/journey/actions";
import { domainLabel } from "@/lib/journey/display";
import type { AgreementStatus, SharedAgreement } from "@/lib/journey/types";
import { AgreementForm } from "./AgreementForm";
import { ConfirmDeleteButton } from "./ConfirmDeleteButton";
import { AgreementStatusPill } from "./StatusPills";

export function AgreementsClient({
  pairingId,
  initialAgreements,
}: {
  pairingId: string;
  initialAgreements: SharedAgreement[];
}) {
  const [agreements, setAgreements] = useState<SharedAgreement[]>(initialAgreements);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAgreement, setEditingAgreement] = useState<SharedAgreement | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function openCreate() {
    setEditingAgreement(null);
    setActionError(null);
    setFormOpen(true);
  }

  function openEdit(agreement: SharedAgreement) {
    setEditingAgreement(agreement);
    setActionError(null);
    setFormOpen(true);
  }

  function onSaved(saved: SharedAgreement) {
    setAgreements((prev) => {
      const exists = prev.some((a) => a.id === saved.id);
      return exists ? prev.map((a) => (a.id === saved.id ? saved : a)) : [saved, ...prev];
    });
    setFormOpen(false);
    setEditingAgreement(null);
  }

  /** Optimistic status toggle (pending ↔ agreed) — reverts on ok:false. */
  async function toggleStatus(agreement: SharedAgreement) {
    if (busyId) return;
    const next: AgreementStatus = agreement.status === "agreed" ? "pending" : "agreed";
    const previous = agreement.status;
    setBusyId(agreement.id);
    setActionError(null);
    setAgreements((prev) =>
      prev.map((a) => (a.id === agreement.id ? { ...a, status: next } : a)),
    );
    try {
      const result = await setAgreementStatus(agreement.id, next);
      if (!result.ok) {
        setAgreements((prev) =>
          prev.map((a) => (a.id === agreement.id ? { ...a, status: previous } : a)),
        );
        setActionError(result.error ?? "Failed to update this agreement. Please try again.");
        return;
      }
      setAgreements((prev) => prev.map((a) => (a.id === agreement.id ? result.data : a)));
    } catch {
      setAgreements((prev) =>
        prev.map((a) => (a.id === agreement.id ? { ...a, status: previous } : a)),
      );
      setActionError("Failed to update this agreement. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(agreement: SharedAgreement) {
    setBusyId(agreement.id);
    setActionError(null);
    try {
      const result = await deleteAgreement(agreement.id);
      if (!result.ok) {
        setActionError(result.error ?? "Failed to delete this agreement. Please try again.");
        return;
      }
      setAgreements((prev) => prev.filter((a) => a.id !== agreement.id));
    } catch {
      setActionError("Failed to delete this agreement. Please try again.");
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
          <AgreementForm
            pairingId={pairingId}
            agreement={editingAgreement}
            onSaved={onSaved}
            onCancel={() => {
              setFormOpen(false);
              setEditingAgreement(null);
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
          New agreement
        </button>
      )}

      {agreements.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-card-border bg-card-bg p-8 text-center text-sm text-text-secondary">
          No shared agreements yet — agree on something together, and mark it as agreed when
          you&apos;re both aligned.
        </p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {agreements.map((agreement) => (
            <li
              key={agreement.id}
              className="rounded-xl border border-card-border bg-card-bg px-4 py-3.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {domainLabel(agreement.domain) ? (
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-accent-700">
                      {domainLabel(agreement.domain)}
                    </p>
                  ) : null}
                  <p className="mt-0.5 text-sm font-semibold text-text-primary">{agreement.title}</p>
                  {agreement.description ? (
                    <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                      {agreement.description}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <button
                    type="button"
                    onClick={() => void toggleStatus(agreement)}
                    disabled={busyId !== null}
                    aria-pressed={agreement.status === "agreed"}
                    className="rounded-lg p-0.5 transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busyId === agreement.id ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-text-tertiary">
                        <Loader2 size={12} className="animate-spin" />
                        Saving…
                      </span>
                    ) : (
                      <AgreementStatusPill status={agreement.status} />
                    )}
                  </button>
                  <span className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(agreement)}
                      disabled={busyId !== null}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-secondary transition hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Pencil size={13} />
                      Edit
                    </button>
                    <ConfirmDeleteButton
                      label="Delete"
                      onDelete={() => remove(agreement)}
                      busy={busyId === agreement.id}
                    />
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 flex items-center gap-1.5 text-xs leading-relaxed text-text-tertiary">
        <Check size={13} strokeWidth={1.5} className="shrink-0" />
        &apos;Agreed&apos; means you&apos;re both aligned on this decision. You can change or remove an
        agreement anytime — both of you can see these.
      </p>
    </div>
  );
}
