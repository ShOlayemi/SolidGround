// ──────────────────────────────────────────────────────────────
// SolidGround AI — Blocked Users (server page)
// ──────────────────────────────────────────────────────────────
// Loads the current user's blocked list (server action) and hands it to the
// client component that renders it and handles unblocking. Data access stays
// in src/lib/trust/actions.ts — the page/server component never talks to
// Supabase directly.
// ──────────────────────────────────────────────────────────────
import Link from "next/link";
import { listBlockedUsers } from "@/lib/trust/actions";
import { BlockedUsersList } from "@/components/trust/BlockedUsersList";

import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Blocked Users",
  description: "Manage who you've blocked on SolidGround.",
};

export default async function BlockedUsersPage() {
  const blocked = await listBlockedUsers();
  return (
    <div className="max-w-[800px]">
      <header className="mb-8">
        <Link
          href="/dashboard/settings"
          className="mb-3 inline-flex items-center gap-1 text-[13px] font-medium text-text-tertiary transition hover:text-text-primary"
        >
          ← Settings
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
          Blocked Users
        </h1>
        <p className="mt-2 text-text-secondary">
          People you&apos;ve blocked can&apos;t invite, message, or connect with
          you. Unblocking someone restores your connection.
        </p>
      </header>

      <section>
        <BlockedUsersList initial={blocked} />
      </section>
    </div>
  );
}
