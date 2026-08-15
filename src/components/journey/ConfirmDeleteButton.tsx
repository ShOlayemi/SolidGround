"use client";

// ──────────────────────────────────────────────────────────────
// SolidGround AI — Inline two-step delete button
// ──────────────────────────────────────────────────────────────
// Used on the Journey goals / agreements / reflections lists. First click
// arms the destructive state ("Confirm" + "Cancel" appear); the second click
// on Confirm actually deletes. Keeps destructive actions out of a single
// accidental click without a modal. The parent drives `busy` while the
// delete action is in flight (the row usually disappears on success).
// ──────────────────────────────────────────────────────────────

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

export function ConfirmDeleteButton({
  label = "Delete",
  onDelete,
  busy = false,
}: {
  label?: string;
  onDelete: () => Promise<void> | void;
  busy?: boolean;
}) {
  const [armed, setArmed] = useState(false);

  if (busy) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-danger-600 opacity-60"
      >
        <Loader2 size={13} className="animate-spin" />
        Deleting…
      </button>
    );
  }

  if (armed) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            setArmed(false);
            void onDelete();
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-danger-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-danger-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-500"
        >
          <Trash2 size={13} />
          Confirm
        </button>
        <button
          type="button"
          onClick={() => setArmed(false)}
          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-secondary transition hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setArmed(true)}
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-tertiary transition hover:bg-danger-50 hover:text-danger-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-500"
    >
      <Trash2 size={13} />
      {label}
    </button>
  );
}
