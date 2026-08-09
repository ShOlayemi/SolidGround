import Link from "next/link";
import { getAssessmentProgress } from "@/lib/assessment/actions";
import { getResults } from "@/lib/scoring/actions";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_ORDER, CATEGORY_LABELS, CATEGORY_DESCRIPTIONS, getQuestionsByCategory } from "@/lib/assessment/questions";
import { Button } from "@/components/ui/Button";
import { ResetSessionButton } from "@/components/assessment/ResetSessionButton";
import { ModeSelector } from "@/components/assessment/ModeSelector";
import type { BlueprintResults } from "@/lib/scoring/types";
import { checkBlueprintLimit } from "@/lib/billing/middleware";
import { UpgradePrompt } from "@/components/billing/UpgradePrompt";

import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Compatibility Blueprint™",
  description: "Start or continue your Compatibility Blueprint™ assessment.",
};
export default async function BlueprintPage() {
  const { success, progress } = await getAssessmentProgress();
  const blueprintLimit = await checkBlueprintLimit();

  if (!success || !progress) {
    return (
      <div className="max-w-[720px] mx-auto py-16 px-4 text-center">
        <h1 className="text-[24px] font-semibold text-solid-text mb-3">
          Something went wrong
        </h1>
        <p className="text-[15px] text-solid-text-secondary mb-6">
          We couldn&apos;t load your assessment data. Please try again.
        </p>
        <a
          href="/dashboard/blueprint"
          className="text-[14px] font-medium text-solid-accent hover:text-solid-accent-hover transition-colors"
        >
          Retry
        </a>
      </div>
    );
  }

  const hasActiveSession =
    progress.session.status === "in_progress" && progress.totalAnswered > 0;
  const isNotStarted =
    progress.session.status === "not_started" || progress.totalAnswered === 0;

  // Check for a completed session with results
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  let completedSessionId: string | null = null;
  let completedResults: Awaited<ReturnType<typeof getResults>> | null = null;

  if (session?.user) {
    // Find the most recent completed session
    const { data: completedSession } = await supabase
      .from("assessment_sessions")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (completedSession) {
      completedSessionId = completedSession.id;
      completedResults = await getResults(completedSession.id);
    }
  }

  const hasCompletedResults =
    completedResults?.success && completedResults.results;
  const isCompletedNoResults =
    completedSessionId && !hasCompletedResults;

  return (
    <div className="max-w-[1120px]">
      {hasCompletedResults ? (
        <CompletedView
          sessionId={completedSessionId!}
          results={completedResults!.results!}
          onResume={
            hasActiveSession ? (
              <ResumeView progress={progress} />
            ) : undefined
          }
        />
      ) : isCompletedNoResults ? (
        <ComputingView />
      ) : isNotStarted ? (
        <StartView canStart={blueprintLimit.allowed} />
      ) : (
        <ResumeView progress={progress} />
      )}
    </div>
  );
}

/* ── Start View ──────────────────────────────────────────── */

function StartView({ canStart }: { canStart: boolean }) {
  return (
    <div className="max-w-[720px] mx-auto py-12 md:py-16 px-4 text-center">
      {/* Logo / Wordmark */}
      <div className="mb-8">
        <span className="text-[20px] font-semibold tracking-tight text-solid-accent">
          SolidGround
        </span>
      </div>

      {/* Headline */}
      <h1 className="text-[32px] md:text-[40px] leading-[1.15] font-semibold tracking-tight text-solid-text mb-4">
        Compatibility Blueprint<span className="text-solid-accent">™</span>
      </h1>

      {/* Subhead */}
      <p className="text-[17px] md:text-[18px] text-solid-text-secondary max-w-[540px] mx-auto mb-8 leading-relaxed">
        Discover what matters in your relationships. {getTotalQuestionCount()} questions across{" "}
        {CATEGORY_ORDER.length} dimensions of compatibility.
      </p>

      {/* Stats */}
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-10 text-[14px] text-solid-text-secondary">
        <span>{CATEGORY_ORDER.length} categories</span>
        <span className="w-1 h-1 rounded-full bg-solid-border" />
        <span>~20 minutes</span>
        <span className="w-1 h-1 rounded-full bg-solid-border" />
        <span>Private &amp; secure</span>
      </div>

      {/* Start button */}
      {canStart ? (
        <ModeSelector
          resetFirst={false}
          label="Start Assessment"
          variant="filled"
          size="lg"
        />
      ) : (
        <UpgradePrompt feature="Additional Blueprint assessments" message="You have used your free Blueprint. Upgrade to continue building your profile." />
      )}

      {/* Category grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-16 text-left">
        {CATEGORY_ORDER.map((cat) => (
          <div
            key={cat}
            className="bg-solid-surface border border-solid-border rounded-xl p-5 hover:border-solid-accent/20 transition-colors duration-200"
          >
            <h3 className="text-[14px] font-semibold text-solid-text mb-1">
              {CATEGORY_LABELS[cat]}
            </h3>
            <p className="text-[13px] text-solid-text-secondary leading-relaxed">
              {CATEGORY_DESCRIPTIONS[cat] ?? ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Resume View ─────────────────────────────────────────── */

function ResumeView({
  progress,
}: {
  progress: NonNullable<
    Awaited<ReturnType<typeof getAssessmentProgress>>["progress"]
  >;
}) {
  const { session, categories, totalQuestions, totalAnswered, percentage } =
    progress;

  const radius = 56;
  const strokeWidth = 5;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="max-w-[720px] mx-auto py-12 md:py-16 px-4">
      {/* Wordmark */}
      <div className="mb-8 text-center">
        <span className="text-[20px] font-semibold tracking-tight text-solid-accent">
          SolidGround
        </span>
      </div>

      {/* Headline */}
      <div className="text-center mb-10">
        <h1 className="text-[32px] md:text-[40px] leading-[1.15] font-semibold tracking-tight text-solid-text mb-3">
          Continue Your Blueprint
        </h1>
        <p className="text-[16px] text-solid-text-secondary">
          You&apos;ve answered {totalAnswered} of {totalQuestions} questions. Pick up where you
          left off.
        </p>
      </div>

      {/* Progress ring */}
      <div className="flex justify-center mb-10">
        <div className="relative inline-flex items-center justify-center">
          <svg width="140" height="140" className="-rotate-90">
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-solid-border"
            />
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="text-solid-accent transition-[stroke-dashoffset] duration-700 ease-out"
            />
          </svg>
          <span className="absolute text-[32px] font-semibold tracking-tight text-solid-text">
            {percentage}%
          </span>
        </div>
      </div>

      {/* Per-category progress */}
      <div className="space-y-3 mb-10">
        {categories.map((cat) => (
          <div key={cat.category} className="flex items-center gap-4">
            <span className="w-[140px] text-[13px] font-medium text-solid-text-secondary shrink-0">
              {cat.label}
            </span>
            <div className="flex-1 h-2 rounded-full bg-solid-border overflow-hidden">
              <div
                className="h-full rounded-full bg-solid-accent transition-[width] duration-500 ease-out"
                style={{
                  width: cat.total > 0 ? `${(cat.answered / cat.total) * 100}%` : "0%",
                }}
              />
            </div>
            <span className="text-[12px] text-solid-text-tertiary w-10 text-right tabular-nums shrink-0">
              {cat.answered}/{cat.total}
            </span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/dashboard/blueprint/assess">
            <Button variant="filled" size="lg">
              Continue
            </Button>
          </Link>
        </div>
        <ResetSessionButton
          variant="link"
          label="Start Over"
          description="This will discard your current progress and create a fresh assessment."
        />
      </div>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────── */

function getTotalQuestionCount(): number {
  let total = 0;
  for (const cat of CATEGORY_ORDER) {
    total += getQuestionsByCategory(cat).length;
  }
  return total;
}

/* ── Completed View ─────────────────────────────────────── */

function CompletedView({
  sessionId,
  results,
  onResume,
}: {
  sessionId: string;
  results: BlueprintResults;
  onResume?: React.ReactNode;
}) {
  return (
    <div className="max-w-[720px] mx-auto py-12 md:py-16 px-4 text-center">
      {/* Wordmark */}
      <div className="mb-8">
        <span className="text-[20px] font-semibold tracking-tight text-solid-accent">
          SolidGround
        </span>
      </div>

      {/* Headline */}
      <h1 className="text-[32px] md:text-[40px] leading-[1.15] font-semibold tracking-tight text-solid-text mb-3">
        Your Blueprint is Ready
      </h1>
      <p className="text-[16px] text-solid-text-secondary max-w-[480px] mx-auto mb-10">
        You&apos;ve completed your Compatibility Blueprint assessment. View your
        detailed results across all {CATEGORY_ORDER.length} dimensions.
      </p>

      {/* Score preview */}
      <div className="flex justify-center mb-10">
        <div className="inline-flex items-center gap-3 bg-solid-surface border border-solid-border rounded-xl px-6 py-4">
          <span className="text-[14px] text-solid-text-secondary">
            Overall Compatibility Score
          </span>
          <span className="text-[28px] font-semibold tracking-tight text-solid-accent">
            {results.overallScore}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link href={`/dashboard/blueprint/results?sessionId=${sessionId}`}>
          <Button variant="filled" size="lg">
            View Your Results
          </Button>
        </Link>
      </div>

      <div className="mt-6">
        <ModeSelector
          resetFirst
          label="Start a New Assessment"
          variant="ghost"
          size="md"
        />
        <p className="text-[12px] text-solid-text-tertiary mt-1">
          Take the assessment again with a fresh session.
        </p>
      </div>

      {/* In-progress session if any */}
      {onResume && (
        <div className="mt-12 pt-8 border-t border-solid-border">
          {onResume}
        </div>
      )}
    </div>
  );
}

/* ── Computing View ─────────────────────────────────────── */

function ComputingView() {
  return (
    <div className="max-w-[640px] mx-auto py-20 px-4 text-center">
      <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-full bg-solid-accent-subtle">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-solid-accent animate-spin"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      </div>
      <h1 className="text-[24px] font-semibold text-solid-text mb-3">
        Computing your results…
      </h1>
      <p className="text-[15px] text-solid-text-secondary mb-6">
        We&apos;re analyzing your responses across all {CATEGORY_ORDER.length}{" "}
        dimensions. This should only take a moment.
      </p>
      <Link href="/dashboard/blueprint">
        <Button variant="ghost" size="md">
          Refresh
        </Button>
      </Link>
    </div>
  );
}
