// ──────────────────────────────────────────────────────────────
// SolidGround AI — Coach Home Page (/dashboard/coach)
// ──────────────────────────────────────────────────────────────
// Server component: loads the user's conversations via the coach
// server action and hands them to the client surface. Auth is handled
// by the dashboard layout. No premium gating — the coach is free
// (matches mobile parity).
// ──────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import { listConversations } from "@/lib/coach/actions";
import { CoachHomeClient } from "@/components/coach/CoachHomeClient";

export const metadata: Metadata = {
  title: "AI Coach",
  description: "A private space to think clearly about your relationships.",
};

export default async function CoachHomePage() {
  const result = await listConversations();

  return (
    <CoachHomeClient
      initialConversations={result.ok ? (result.conversations ?? []) : []}
      initialError={result.ok ? null : (result.error ?? "Failed to load conversations.")}
    />
  );
}
