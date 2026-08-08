// ──────────────────────────────────────────────────────────────
// SolidGround AI — Blueprint Results Page
// ──────────────────────────────────────────────────────────────

import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/actions";
import { getResults } from "@/lib/scoring/actions";
import { getMyPairings } from "@/lib/pairings/actions";
import { getAIInsights } from "@/lib/ai/actions";
import { getNPSEligibility } from "@/lib/feedback/actions";
import { ResultsView } from "@/components/assessment/ResultsView";
import { NPSSurveyLazy } from "@/components/feedback/NPSSurveyLazy";
import { Button } from "@/components/ui/Button";
import type { AIInsights } from "@/types";
import { checkAccess } from "@/lib/billing/middleware";

interface ResultsPageProps {
  searchParams: Promise<{ sessionId?: string }>;
}

import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Your Blueprint Results",
  description: "Your Compatibility Blueprint™ results and AI insights.",
};
export default async function ResultsPage({ searchParams }: ResultsPageProps) {
  const params = await searchParams;
  const sessionId = params.sessionId;

  if (!sessionId) {
    return (
      <div className="max-w-[640px] mx-auto py-20 px-4 text-center">
        <h1 className="text-[24px] font-semibold text-solid-text mb-3">
          No session specified
        </h1>
        <p className="text-[15px] text-solid-text-secondary mb-6">
          Please access your results from the Blueprint page.
        </p>
        <Link href="/dashboard/blueprint">
          <Button variant="filled" size="md">
            ← Back to Blueprint
          </Button>
        </Link>
      </div>
    );
  }

  const result = await getResults(sessionId);

  if (!result.success) {
    // Auth error → redirect to login
    if (result.error === "Not authenticated.") {
      redirect("/login");
    }

    return (
      <div className="max-w-[640px] mx-auto py-20 px-4 text-center">
        <h1 className="text-[24px] font-semibold text-solid-text mb-3">
          {result.error === "Results not available. Complete the assessment first."
            ? "Complete the assessment first"
            : "Results unavailable"}
        </h1>
        <p className="text-[15px] text-solid-text-secondary mb-6">
          {result.error === "Results not available. Complete the assessment first."
            ? "You need to complete the Compatibility Blueprint assessment before viewing your results."
            : result.error ?? "Something went wrong loading your results."}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/dashboard/blueprint">
            <Button variant="filled" size="md">
              Go to Blueprint
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost" size="md">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Success — fetch pairings & AI insights in parallel
  const access = await checkAccess("aiInsightCount");
  const [pairingsResult, insightsResult] = await Promise.all([
    getMyPairings(),
    access.allowed ? getAIInsights(sessionId) : Promise.resolve({ success: false as const }),
  ]);

  const pairings = pairingsResult.success ? (pairingsResult.pairings ?? []) : [];
  const insights: AIInsights | null =
    insightsResult.success && insightsResult.insights
      ? insightsResult.insights
      : null;

  // NPS survey — prompted once, right after assessment completion
  const session = await getSession();
  const npsEligibility = session
    ? await getNPSEligibility(session.user.id)
    : null;
  const npsSurvey =
    session && npsEligibility?.success && npsEligibility.eligible ? (
      <div className="mx-auto mt-10 w-full max-w-[760px] px-4 pb-8">
        <NPSSurveyLazy
          userId={session.user.id}
          eligible={true}
          source="assessment"
        />
      </div>
    ) : null;

  return (
    <>
      <ResultsView results={result.results!} sessionId={sessionId} pairings={pairings} insights={insights} canGenerate={access.allowed} />
      {npsSurvey}
    </>
  );
}