"use client";

// ──────────────────────────────────────────────────────────────
// SolidGround AI — Results View (client component)
// ──────────────────────────────────────────────────────────────

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import type { BlueprintResults, CategoryResult } from "@/lib/scoring/types";
import { getQuestionById, CATEGORY_LABELS } from "@/lib/assessment/questions";
import type { AssessmentCategory } from "@/types";
import type { PairingWithNames, AIInsights } from "@/types";
import { ScoreRing } from "./ScoreRing";
import { CategoryCard } from "./CategoryCard";
import { Button } from "@/components/ui/Button";
import { createInvite } from "@/lib/pairings/actions";
import { trackEvent } from "@/lib/analytics/events";
import { AIInsightsSection } from "./AIInsightsSection";

interface ResultsViewProps {
  results: BlueprintResults;
  sessionId: string;
  pairings?: PairingWithNames[];
  insights: AIInsights | null;
}

interface QuestionScoreDisplay {
  questionId: string;
  questionText: string;
  score: number;
  categoryId: string;
  categoryLabel: string;
}

function buildQuestionScoreList(
  categoryResults: CategoryResult[],
  filter: "strengths" | "growth",
): QuestionScoreDisplay[] {
  const items: QuestionScoreDisplay[] = [];

  for (const cr of categoryResults) {
    const ids = filter === "strengths" ? cr.strengths : cr.growthAreas;
    for (const qId of ids) {
      const question = getQuestionById(qId);
      const score = cr.questionScores[qId] ?? 0;
      items.push({
        questionId: qId,
        questionText: question?.text ?? `Question ${qId}`,
        score,
        categoryId: cr.category,
        categoryLabel: cr.label,
      });
    }
  }

  // Sort by score descending for strengths, ascending for growth
  items.sort((a, b) =>
    filter === "strengths" ? b.score - a.score : a.score - b.score,
  );
  return items;
}

function scoreColor(score: number): string {
  if (score >= 70) return "#2E4A3A";
  if (score >= 40) return "#C4943A";
  return "#C44E4E";
}

export function ResultsView({ results, sessionId, pairings, insights }: ResultsViewProps) {
  const { overallScore, overallConfidence, categoryResults, completedAt } =
    results;
  useEffect(() => { trackEvent("report_viewed", { report_type: "blueprint" }); }, []);
  const strengths = buildQuestionScoreList(categoryResults, "strengths");
  const growthAreas = buildQuestionScoreList(categoryResults, "growth");

  const completedDate = completedAt
    ? new Date(completedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="max-w-[960px] mx-auto py-8 md:py-12 px-4">
      {/* ── Hero Section ──────────────────────────────────── */}
      <section className="text-center mb-16">
        <h1 className="text-[32px] md:text-[40px] leading-[1.15] font-semibold tracking-tight text-solid-text mb-2">
          Your Compatibility Blueprint
        </h1>
        {completedDate && (
          <p className="text-[15px] text-solid-text-secondary mb-10">
            Completed {completedDate}
          </p>
        )}

        <div className="flex justify-center">
          <ScoreRing
            score={overallScore}
            confidence={overallConfidence}
            size="lg"
            label="overall"
          />
        </div>
      </section>

      {/* ── Category Breakdown ────────────────────────────── */}
      <section className="mb-16">
        <h2 className="text-[22px] font-semibold tracking-tight text-solid-text mb-8">
          Category Breakdown
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categoryResults.map((cr) => (
            <CategoryCard key={cr.category} result={cr} />
          ))}
        </div>
      </section>

      {/* ── Strengths Section ─────────────────────────────── */}
      {strengths.length > 0 && (
        <section className="mb-16">
          <h2 className="text-[22px] font-semibold tracking-tight text-solid-text mb-6">
            Your Strengths
          </h2>
          <p className="text-[15px] text-solid-text-secondary mb-8">
            Areas where you scored highly — these are your relationship
            superpowers.
          </p>
          <QuestionList items={strengths} type="strength" />
        </section>
      )}

      {/* ── Growth Areas Section ──────────────────────────── */}
      {growthAreas.length > 0 && (
        <section className="mb-16">
          <h2 className="text-[22px] font-semibold tracking-tight text-solid-text mb-6">
            Growth Areas
          </h2>
          <p className="text-[15px] text-solid-text-secondary mb-8">
            Areas with room for reflection and development. Growth isn&apos;t a
            weakness — it&apos;s awareness.
          </p>
          <QuestionList items={growthAreas} type="growth" />
        </section>
      )}

      {/* ── Empty state for both ──────────────────────────── */}
      {strengths.length === 0 && growthAreas.length === 0 && (
        <section className="mb-16 text-center py-12">
          <p className="text-[16px] text-solid-text-secondary">
            Your results are balanced across all categories. This suggests a
            well-rounded compatibility profile.
          </p>
        </section>
      )}

      {/* ── AI-Powered Insights ────────────────────────────── */}
      <AIInsightsSection
        sessionId={sessionId}
        initialInsights={insights}
      />

      {/* ── What's Next ───────────────────────────────────── */}
      <WhatNextSection sessionId={sessionId} pairings={pairings ?? []} />
    </div>
  );
}

/* ── What's Next Section ────────────────────────────────── */

function WhatNextSection({
  sessionId,
  pairings,
}: {
  sessionId: string;
  pairings: PairingWithNames[];
}) {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerateInvite = useCallback(async () => {
    setGenerating(true);
    setInviteError(null);
    try {
      const result = await createInvite(sessionId);
      if (result.success && result.inviteCode) {
        setInviteCode(result.inviteCode);
        trackEvent("partner_invite_sent");
      } else {
        setInviteError(result.error ?? "Failed to generate invite link.");
      }
    } catch {
      setInviteError("Something went wrong. Please try again.");
    } finally {
      setGenerating(false);
    }
  }, [sessionId]);

  const handleCopy = useCallback(async () => {
    if (!inviteCode) return;
    const url = `${window.location.origin}/invite/${inviteCode}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }, [inviteCode]);

  const hasCompletedPairings = pairings.some(
    (p) => p.status === "completed" && p.alignment_results,
  );

  return (
    <section className="bg-solid-surface border border-solid-border rounded-2xl p-8 md:p-10 text-center">
      <h2 className="text-[22px] font-semibold tracking-tight text-solid-text mb-3">
        What&apos;s Next?
      </h2>
      <p className="text-[15px] text-solid-text-secondary max-w-[480px] mx-auto mb-8">
        Your Compatibility Blueprint is just the start. Share it with a
        partner, retake it as you evolve, or explore what your results mean.
      </p>

      {/* CTA Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-[600px] mx-auto mb-8">
        {/* Invite Partner Card */}
        <div className="bg-solid-bg border border-solid-border rounded-xl p-5 text-left">
          <h3 className="text-[15px] font-semibold text-solid-text mb-2">
            Invite Your Partner
          </h3>
          <p className="text-[13px] text-solid-text-secondary mb-4">
            Share a link with your partner to compare compatibility profiles.
          </p>

          {inviteCode ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-solid-surface border border-solid-border rounded-lg px-3 py-2 text-[13px] text-solid-text truncate">
                  {typeof window !== "undefined"
                    ? `${window.location.origin}/invite/${inviteCode}`
                    : inviteCode}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  type="button"
                >
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
              <p className="text-[12px] text-solid-text-tertiary">
                Send this link to your partner to compare results.
              </p>
            </div>
          ) : (
            <>
              <Button
                variant="filled"
                size="sm"
                onClick={handleGenerateInvite}
                disabled={generating}
                type="button"
              >
                {generating ? "Generating..." : "Generate Invite Link"}
              </Button>
              {inviteError && (
                <p className="text-[12px] text-solid-error mt-2">
                  {inviteError}
                </p>
              )}
            </>
          )}
        </div>

        {/* View Pairings Card */}
        <div className="bg-solid-bg border border-solid-border rounded-xl p-5 text-left">
          <h3 className="text-[15px] font-semibold text-solid-text mb-2">
            View Pairings
          </h3>
          <p className="text-[13px] text-solid-text-secondary mb-4">
            {hasCompletedPairings
              ? "See your alignment results with partners who have accepted your invite."
              : pairings.length > 0
                ? "You have pending invites waiting for a partner to accept."
                : "Once you and a partner compare profiles, your results appear here."}
          </p>
          {pairings.length > 0 ? (
            <Link href="/dashboard/pairings">
              <Button variant="outline" size="sm">
                View Pairings ({pairings.length})
              </Button>
            </Link>
          ) : (
            <span className="text-[13px] text-solid-text-tertiary">
              No pairings yet
            </span>
          )}
        </div>
      </div>

      {/* Bottom Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link href="/dashboard/blueprint/assess?restart=1">
          <Button variant="outline" size="lg">
            Retake Assessment
          </Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="ghost" size="lg">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </section>
  );
}

/* ── Question List Sub-component ─────────────────────────── */

function QuestionList({
  items,
  type,
}: {
  items: QuestionScoreDisplay[];
  type: "strength" | "growth";
}) {
  // Group by category
  const grouped = new Map<string, QuestionScoreDisplay[]>();
  for (const item of items) {
    const existing = grouped.get(item.categoryId);
    if (existing) {
      existing.push(item);
    } else {
      grouped.set(item.categoryId, [item]);
    }
  }

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([categoryId, qs]) => (
        <div key={categoryId}>
          <h3 className="text-[14px] font-semibold text-solid-text mb-3">
            {CATEGORY_LABELS[categoryId as AssessmentCategory] ?? categoryId}
          </h3>
          <div className="space-y-2">
            {qs.map((item) => (
              <div
                key={item.questionId}
                className="flex items-start justify-between gap-4 bg-solid-surface border border-solid-border rounded-lg p-4"
              >
                <p className="text-[14px] text-solid-text-secondary leading-relaxed flex-1 min-w-0">
                  {item.questionText}
                </p>
                <span
                  className="text-[14px] font-semibold shrink-0"
                  style={{ color: scoreColor(item.score) }}
                >
                  {item.score}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
