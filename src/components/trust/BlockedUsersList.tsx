"use client";
// ──────────────────────────────────────────────────────────────
// SolidGround AI — Blocked Users list (client)
// ──────────────────────────────────────────────────────────────
// Interactive portion of /dashboard/settings/blocked: renders the blocked
// users supplied by the server page and handles the unblock action (server
// action) with an inline two-step confirm (first click arms "Confirm", the
// second performs the unblock). On success the row is removed; on error an
// inline message is shown. Empty state is handled here so the whole card is
// one cohesive unit.
// ──────────────────────────────────────────────────────────────
import { useState, useTransition } from "react";
import { Loader2, ShieldOff, UserX } from "lucide-react";
import { unblockUser } from "@/lib/trust/actions";
import type { BlockedUser } from "@/lib/trust/actions";

export function BlockedUsersList({ initial }: { initial: BlockedUser[] }) {
  const [blocked, setBlocked] = useState(initial);
  const [armedId, setArmedId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function cancelArm() {
    setArmedId(null);
    setError(null);
  }

  function performUnblock(user: BlockedUser) {
    setPendingId(user.id);
    setError(null);
    startTransition(async () => {
      const result = await unblockUser(user.id);
      if (result.ok) {
        setBlocked((prev) => prev.filter((b) => b.id !== user.id));
        setArmedId(null);
      } else {
        setError(result.error);
      }
      setPendingId(null);
    });
  }

  return (
    <div>
      {error ? (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700"
        >
          {error}
        </div>
      ) : null}

      {blocked.length === 0 ? (
        <div className="rounded-xl border border-dashed border-card-border bg-card-bg p-10 text-center">
          <UserX
            size={28}
            strokeWidth={1.5}
            className="mx-auto text-text-tertiary"
            aria-hidden
          />
          <p className="mt-4 text-sm font-medium text-text-primary">
            You haven&apos;t blocked anyone.
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            When you block someone, they&apos;ll appear here and won&apos;t be
            able to invite, message, or connect with you.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-card-border rounded-xl border border-card-border bg-card-bg">
          {blocked.map((user) => (
            <li
              key={user.id}
              className="flex items-center justify-between gap-4 px-5 py-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                  {user.displayName.trim().charAt(0).toUpperCase() || "?"}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {user.displayName}
                  </p>
                  <p className="text-xs text-text-tertiary">
                    Blocked ·{" "}
                    {new Date(user.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center">
                {pendingId === user.id ? (
                  <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-tertiary">
                    <Loader2 size={13} className="animate-spin" />
                    Unblocking…
                  </span>
                ) : armedId === user.id ? (
                  <span className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => performUnblock(user)}
                      disabled={pendingId !== null}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-danger-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-danger-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ShieldOff size={13} />
                      Confirm unblock
                    </button>
                    <button
                      type="button"
                      onClick={cancelArm}
                      disabled={pendingId !== null}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-secondary transition hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setArmedId(user.id);
                      setError(null);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-tertiary transition hover:bg-slate-100 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                  >
                    <ShieldOff size={13} />
                    Unblock
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
