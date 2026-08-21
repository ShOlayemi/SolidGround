// ──────────────────────────────────────────────────────────────
// SolidGround AI — Privacy Center (server page)
// ──────────────────────────────────────────────────────────────
// A plain-language inventory of what SolidGround stores and who can see it.
// The content lives in src/lib/privacy/categories.ts (static data module);
// the rendering component (PrivacyCenterView) groups the categories into
// three sections by visibility label. Server components only — no data
// fetching beyond the static module.
// ──────────────────────────────────────────────────────────────
import Link from "next/link";
import { PrivacyCenterView } from "@/components/trust/PrivacyCenterView";

import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Privacy Center",
  description: "What SolidGround stores and who can see it.",
};

export default async function PrivacyCenterPage() {
  return (
    <div>
      <header className="mb-8">
        <Link
          href="/dashboard/settings"
          className="mb-3 inline-flex items-center gap-1 text-[13px] font-medium text-text-tertiary transition hover:text-text-primary"
        >
          ← Settings
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
          Privacy Center
        </h1>
        <p className="mt-2 text-text-secondary">
          Understand your data and your control over it.
        </p>
      </header>

      <PrivacyCenterView />
    </div>
  );
}
