// ──────────────────────────────────────────────────────────────
// SolidGround AI — Pairings List Page
// ──────────────────────────────────────────────────────────────

import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyPairings } from "@/lib/pairings/actions";
import { getDashboardData } from "@/lib/dashboard/actions";
import { Button } from "@/components/ui/Button";
import { InvitePartner } from "@/components/dashboard/InvitePartner";

import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Pairings",
  description: "Manage your partner pairings and Alignment Match™.",
};
export default async function PairingsPage() {
  const [result, dashboard] = await Promise.all([getMyPairings(), getDashboardData()]);

  if (!result.success) {
    if (result.error === "Not authenticated.") {
      redirect("/login?redirect=%2Fdashboard%2Fpairings");
    }

    return (
      <div className="max-w-[640px] mx-auto py-20 px-4 text-center">
        <h1 className="text-[24px] font-semibold text-solid-text mb-3">
          Unable to load pairings
        </h1>
        <p className="text-[15px] text-solid-text-secondary mb-6">
          {result.error}
        </p>
        <Link href="/dashboard">
          <Button variant="filled" size="md">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const pairings = result.pairings ?? [];

  return (
    <div className="max-w-[960px] mx-auto py-8 md:py-10 px-4">
      <h1 className="text-[28px] font-semibold tracking-tight text-solid-text mb-8">
        Pairings
      </h1>

      {dashboard.completedSession ? (
        <InvitePartner
          sessionId={dashboard.completedSession.id}
          initialInviteCode={pairings.find(
            (pairing) => pairing.status === "pending" && pairing.inviter_session_id === dashboard.completedSession?.id,
          )?.invite_code}
        />
      ) : null}

      {pairings.length === 0 ? (
        <div className="bg-solid-surface border border-solid-border rounded-2xl p-10 text-center">
          <h2 className="text-[18px] font-semibold text-solid-text mb-2">
            No pairings yet
          </h2>
          <p className="text-[15px] text-solid-text-secondary mb-6 max-w-[420px] mx-auto">
            {dashboard.completedSession
              ? "Your invite will appear here once your partner accepts it."
              : "Complete your Compatibility Blueprint, then invite a partner to compare profiles and see your Alignment Match™."}
          </p>
          {!dashboard.completedSession ? (
            <Link href="/dashboard/blueprint">
              <Button variant="filled" size="md">
                Go to Blueprint
              </Button>
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          {pairings.map((pairing) => (
            <Link
              key={pairing.id}
              href={
                pairing.status === "completed"
                  ? `/dashboard/pairings/${pairing.id}`
                  : "#"
              }
              className={`block bg-solid-surface border border-solid-border rounded-xl p-5 transition-colors ${
                pairing.status === "completed"
                  ? "hover:border-solid-accent/30 cursor-pointer"
                  : "opacity-70 cursor-default"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-solid-text truncate">
                    {pairing.inviter_name}
                    {pairing.invitee_name ? ` & ${pairing.invitee_name}` : ""}
                  </p>
                  <p className="text-[13px] text-solid-text-secondary mt-0.5">
                    {pairing.status === "completed"
                      ? `Alignment: ${pairing.alignment_results?.overallAlignment ?? "—"}%`
                      : pairing.status === "accepted"
                        ? "Accepted — computing..."
                        : "Pending — waiting for partner"}
                  </p>
                </div>
                <div className="shrink-0">
                  {pairing.status === "completed" ? (
                    <span className="text-[13px] font-medium text-solid-accent">
                      View Results →
                    </span>
                  ) : pairing.status === "pending" ? (
                    <span className="text-[12px] text-solid-text-tertiary bg-solid-bg border border-solid-border rounded-full px-3 py-1">
                      Pending
                    </span>
                  ) : (
                    <span className="text-[12px] text-solid-text-tertiary bg-solid-bg border border-solid-border rounded-full px-3 py-1">
                      Accepted
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
