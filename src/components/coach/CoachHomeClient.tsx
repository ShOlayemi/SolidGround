"use client";

// ──────────────────────────────────────────────────────────────
// SolidGround AI — Coach Home (conversation list + start flow)
// ──────────────────────────────────────────────────────────────
// Client surface for /dashboard/coach. Data is loaded server-side
// (listConversations) and passed in; every mutation goes through the
// coach server actions (createConversation / sendCoachMessage /
// renameConversation / deleteConversation) — never Supabase directly.
//
// Mirrors the mobile coach home: start a conversation (optionally
// seeded with a suggested prompt), reopen recent conversations,
// rename inline, delete behind a confirm dialog, friendly empty
// state, and the brief AI disclosure footer.
// ──────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  Loader2,
  MessageSquarePlus,
  MessagesSquare,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  createConversation,
  deleteConversation,
  renameConversation,
  sendCoachMessage,
} from "@/lib/coach/actions";
import type { CoachConversationSummary } from "@/lib/coach/actions";
import { formatRelativeTime } from "@/lib/coach/format";
import { getGeneralSuggestions } from "@/lib/coach/suggestions";
import { COACH_DISCLOSURE_TEXT } from "@/lib/coach/disclosure";

interface CoachHomeClientProps {
  initialConversations: CoachConversationSummary[];
  initialError: string | null;
}

export function CoachHomeClient({ initialConversations, initialError }: CoachHomeClientProps) {
  const router = useRouter();
  const [conversations, setConversations] = useState<CoachConversationSummary[]>(initialConversations);
  const [error] = useState<string | null>(initialError);
  const [starting, setStarting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [savingRename, setSavingRename] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const suggestions = getGeneralSuggestions();

  /**
   * Create a conversation and (optionally) seed it with a suggested
   * prompt. Seeding is best-effort: a seed-send failure still opens the
   * conversation (the user's text is already persisted by
   * sendCoachMessage) so the user can retry inside the thread.
   */
  async function startConversation(prompt?: string) {
    if (starting) return;
    setStarting(true);
    setActionError(null);
    try {
      const created = await createConversation();
      if (!created.ok || !created.id) {
        setActionError(created.error ?? "Failed to create a conversation.");
        return;
      }
      const trimmedPrompt = prompt?.trim();
      if (trimmedPrompt) {
        try {
          await sendCoachMessage(created.id, trimmedPrompt);
        } catch {
          // fall through — the conversation is open either way
        }
      }
      router.push(`/dashboard/coach/${created.id}`);
      router.refresh();
    } catch {
      setActionError("Failed to create a conversation. Please try again.");
    } finally {
      setStarting(false);
    }
  }

  function beginRename(conversation: CoachConversationSummary) {
    setRenamingId(conversation.id);
    setRenameValue(conversation.title);
    setActionError(null);
  }

  async function saveRename() {
    if (!renamingId) return;
    const trimmed = renameValue.trim();
    if (!trimmed || savingRename) return;
    setSavingRename(true);
    setActionError(null);
    try {
      const result = await renameConversation(renamingId, trimmed);
      if (result.ok) {
        setConversations((prev) =>
          prev.map((c) => (c.id === renamingId ? { ...c, title: trimmed } : c)),
        );
        setRenamingId(null);
      } else {
        setActionError(result.error ?? "Failed to rename the conversation.");
      }
    } catch {
      setActionError("Failed to rename the conversation. Please try again.");
    } finally {
      setSavingRename(false);
    }
  }

  async function confirmDelete() {
    if (!confirmDeleteId || deleting) return;
    setDeleting(true);
    setActionError(null);
    try {
      const result = await deleteConversation(confirmDeleteId);
      if (result.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== confirmDeleteId));
        setConfirmDeleteId(null);
      } else {
        setActionError(result.error ?? "Failed to delete the conversation.");
        setConfirmDeleteId(null);
      }
    } catch {
      setActionError("Failed to delete the conversation. Please try again.");
      setConfirmDeleteId(null);
    } finally {
      setDeleting(false);
    }
  }

  // Escape closes the delete dialog (event listener — no sync setState).
  useEffect(() => {
    if (!confirmDeleteId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setConfirmDeleteId(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [confirmDeleteId]);

  if (error) {
    return (
      <div className="mx-auto max-w-[760px]">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-text-primary">AI Coach</h1>
          <p className="mt-2 text-text-secondary">A private space to think clearly about your relationships.</p>
        </header>
        <div className="rounded-2xl border border-card-border bg-card-bg p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-danger-50 text-danger-600">
            <MessagesSquare size={24} />
          </div>
          <h2 className="mt-5 text-xl font-semibold text-text-primary">Couldn&apos;t load your coach</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-secondary">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const isEmpty = conversations.length === 0;

  return (
    <div className="mx-auto max-w-[760px]">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-text-primary">AI Coach</h1>
          <p className="mt-2 text-text-secondary">A private space to think clearly about your relationships.</p>
        </div>
        <button
          type="button"
          onClick={() => void startConversation()}
          disabled={starting}
          className="inline-flex items-center gap-2 rounded-lg bg-accent-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {starting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          New conversation
        </button>
      </header>

      {actionError ? (
        <div role="alert" className="mb-6 rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {actionError}
        </div>
      ) : null}

      {/* ── Empty state ───────────────────────────────────── */}
      {isEmpty ? (
        <section className="mb-10 rounded-2xl border border-card-border bg-card-bg p-8 text-center md:p-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-100 text-accent-700">
            <MessageSquarePlus size={24} />
          </div>
          <h2 className="mt-5 text-xl font-semibold text-text-primary">What&apos;s on your mind?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-secondary">
            Talk through what&apos;s on your mind — the coach will reflect with you, one question at a
            time. Start with a suggestion below or write your own.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {suggestions.slice(0, 3).map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                disabled={starting}
                onClick={() => void startConversation(suggestion.prompt)}
                className="rounded-full border border-accent-200 bg-accent-50 px-4 py-2 text-sm font-medium text-accent-700 transition hover:border-accent-300 hover:bg-accent-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:opacity-50"
              >
                {suggestion.prompt.length > 64 ? `${suggestion.prompt.slice(0, 64)}…` : suggestion.prompt}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── Suggested topics ──────────────────────────────── */}
      {!isEmpty ? (
        <section className="mb-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-tertiary">Suggested topics</h2>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                disabled={starting}
                onClick={() => void startConversation(suggestion.prompt)}
                className="max-w-full rounded-full border border-card-border bg-card-bg px-4 py-2 text-left text-sm font-medium text-text-secondary transition hover:border-accent-300 hover:bg-card-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:opacity-50"
              >
                {suggestion.prompt}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── Recent conversations ──────────────────────────── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-tertiary">Recent conversations</h2>
        {isEmpty ? (
          <p className="rounded-xl border border-dashed border-card-border bg-card-bg p-8 text-center text-sm text-text-secondary">
            No conversations yet — start one above whenever you&apos;re ready.
          </p>
        ) : (
          <ul className="space-y-3">
            {conversations.map((conversation) => (
              <li
                key={conversation.id}
                className="flex items-center gap-2 rounded-xl border border-card-border bg-card-bg px-4 py-3 transition hover:border-accent-300 hover:bg-card-hover"
              >
                {renamingId === conversation.id ? (
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <label htmlFor={`rename-${conversation.id}`} className="sr-only">
                      Conversation title
                    </label>
                    <input
                      id={`rename-${conversation.id}`}
                      value={renameValue}
                      onChange={(event) => setRenameValue(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void saveRename();
                        if (event.key === "Escape") setRenamingId(null);
                      }}
                      maxLength={200}
                      autoFocus
                      className="min-w-0 flex-1 rounded-lg border border-accent-300 bg-card-bg px-3 py-2 text-sm text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                    />
                    <button
                      type="button"
                      onClick={() => void saveRename()}
                      disabled={savingRename || renameValue.trim().length === 0}
                      aria-label="Save title"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-secondary transition hover:bg-accent-50 hover:text-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:opacity-40"
                    >
                      {savingRename ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenamingId(null)}
                      aria-label="Cancel rename"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-secondary transition hover:bg-slate-100 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <Link
                      href={`/dashboard/coach/${conversation.id}`}
                      className="min-w-0 flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded-lg"
                    >
                      <span className="block truncate text-sm font-semibold text-text-primary">
                        {conversation.title || "New conversation"}
                      </span>
                      <span className="block text-xs text-text-tertiary">
                        {formatRelativeTime(conversation.updatedAt)}
                      </span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => beginRename(conversation)}
                      aria-label={`Rename ${conversation.title}`}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-tertiary transition hover:bg-accent-50 hover:text-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(conversation.id)}
                      aria-label={`Delete ${conversation.title}`}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-tertiary transition hover:bg-danger-50 hover:text-danger-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-500"
                    >
                      <Trash2 size={15} />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Disclosure footer ─────────────────────────────── */}
      <p className="mt-10 text-center text-xs leading-relaxed text-text-tertiary">{COACH_DISCLOSURE_TEXT}</p>

      {/* ── Delete confirm dialog ─────────────────────────── */}
      {confirmDeleteId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDeleteId(null)} aria-hidden="true" />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="coach-delete-title"
            className="relative w-full max-w-sm rounded-2xl border border-card-border bg-card-bg p-6 shadow-xl"
          >
            <h2 id="coach-delete-title" className="text-lg font-semibold text-text-primary">
              Delete this conversation?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              This removes the conversation and its messages. This can&apos;t be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                autoFocus
                className="rounded-lg px-4 py-2 text-sm font-medium text-text-secondary transition hover:bg-slate-100 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-lg bg-danger-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-danger-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-500 disabled:opacity-50"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
