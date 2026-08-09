// ──────────────────────────────────────────────────────────────
// SolidGround AI — AI Insights Page
// ──────────────────────────────────────────────────────────────

import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/actions";
import { getDashboardData } from "@/lib/dashboard/actions";
import { getAIInsights } from "@/lib/ai/actions";
import { AIInsightsSection } from "@/components/assessment/AIInsightsSection";
import { Button } from "@/components/ui/Button";
import { checkAccess } from "@/lib/billing/middleware";
import type { AIInsights, RelationshipType } from "@/types";

import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "AI Insights",
  description: "Your personalized AI-powered relationship insights.",
};

export default async function AIInsightsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const data = await getDashboardData();
  const sessionId = data.completedSession?.id;
  const mode: RelationshipType | undefined = data.completedSession?.mode ?? data.activeSession?.mode;

  // No completed blueprint yet → guide the user to the assessment
  if (!sessionId) {
    return (
      <div className="rounded-xl border border-dashed border-card-border bg-card-bg p-12 text-center">
        <h1 className="text-2xl font-semibold text-text-primary">
          Complete your Blueprint to unlock AI Insights
        </h1>
        <p className="mt-2 text-text-secondary">
          Your personalized, data-driven insights will appear here after you
          finish the Compatibility Blueprint™ assessment.
        </p>
        <Link href="/dashboard/blueprint" className="mt-6 inline-block">
          <Button variant="filled" size="md">
            Start Blueprint →
          </Button>
        </Link>
      </div>
    );
  }

  // Billing gate — enforces plan limits
  const access = await checkAccess("aiInsightCount");
  const insightsResult = access.allowed
    ? await getAIInsights(sessionId)
    : { success: false as const };
  const insights: AIInsights | null =
    insightsResult.success && insightsResult.insights
      ? insightsResult.insights
      : null;

  return (
    <div className="max-w-[1200px]">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
          AI Insights
        </h1>
        <p className="mt-2 text-text-secondary">
          Personalized guidance based on your Compatibility Blueprint™ results.
        </p>
      </header>
      <AIInsightsSection sessionId={sessionId} initialInsights={insights} mode={mode} />
    </div>
  );
}
