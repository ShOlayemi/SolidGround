"use client";

// ──────────────────────────────────────────────────────────────
// SolidGround AI — AI Insights Section
// ──────────────────────────────────────────────────────────────
// Client component: handles "Generate Insights" button,
// loading states, and rendering all 6 insight subsections.
// ──────────────────────────────────────────────────────────────

import { useState, useCallback } from "react";
import type { AIInsights } from "@/types";
import { getAIInsights } from "@/lib/ai/actions";
import { UpgradePrompt } from "@/components/billing/UpgradePrompt";

interface AIInsightsSectionProps {
  sessionId: string;
  initialInsights: AIInsights | null;
  canGenerate?: boolean;
}

export function AIInsightsSection({
  sessionId,
  initialInsights,
  canGenerate = true,
}: AIInsightsSectionProps) {
  const [insights, setInsights] = useState<AIInsights | null>(initialInsights);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAIInsights(sessionId);
      if (result.success && result.insights) {
        setInsights(result.insights);
      } else {
        setError(result.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // ── Loading state ──────────────────────────────────────────
  if (loading) {
    return (
      <section className="mb-16">
        <h2 className="text-[22px] font-semibold tracking-tight text-solid-text mb-8">
          AI-Powered Insights
        </h2>
        <div className="space-y-6">
          <SkeletonBlock lines={4} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SkeletonBlock lines={3} />
            <SkeletonBlock lines={3} />
          </div>
          <SkeletonBlock lines={2} />
        </div>
      </section>
    );
  }

  // ── No insights yet ────────────────────────────────────────
  if (!insights) {
    if (!canGenerate) return <section className="mb-16"><UpgradePrompt feature="AI Insights" message="Unlock personalized analysis of your Blueprint results with Premium." /></section>;
    return (
      <section className="mb-16 bg-solid-surface border border-solid-border rounded-2xl p-8 md:p-10 text-center">
        <h2 className="text-[22px] font-semibold tracking-tight text-solid-text mb-3">
          AI-Powered Insights
        </h2>
        <p className="text-[15px] text-solid-text-secondary max-w-[480px] mx-auto mb-8">
          Get personalized, data-driven insights based on your Compatibility
          Blueprint™ results. Understand your strengths, growth areas, and
          relationship patterns — powered by AI analysis of your actual
          assessment data.
        </p>
        <button
          onClick={handleGenerate}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-solid-accent text-white text-[14px] font-medium hover:bg-solid-accent/90 transition-colors"
        >
          <SparkleIcon />
          Generate Insights
        </button>
        {error && (
          <p className="text-[13px] text-solid-error mt-4">{error}</p>
        )}
        <p className="text-[12px] text-solid-text-tertiary mt-4">
          Generated from your Blueprint results. Regenerating will produce a fresh analysis.
        </p>
      </section>
    );
  }

  // ── Render all subsections ─────────────────────────────────
  const readinessLevel = insights.relationshipReadiness.level;

  return (
    <section className="mb-16">
      <h2 className="text-[22px] font-semibold tracking-tight text-solid-text mb-8">
        AI-Powered Insights
      </h2>

      <div className="space-y-10">
        {/* 1. Blueprint Summary */}
        <SubsectionCard>
          <SubsectionHeading
            icon={<DocumentIcon />}
            title="Blueprint Summary"
          />
          <p className="text-[15px] text-solid-text-secondary leading-relaxed whitespace-pre-line">
            {insights.blueprintSummary}
          </p>
        </SubsectionCard>

        {/* 2. Personal Strengths */}
        <SubsectionCard>
          <SubsectionHeading
            icon={<CheckCircleIcon />}
            title="Personal Strengths"
          />
          <ul className="space-y-3">
            {insights.personalStrengths.map((s, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="shrink-0 mt-0.5 text-[var(--color-score-strong)]">
                  <CheckIcon />
                </span>
                <span className="text-[15px] text-solid-text-secondary leading-relaxed">
                  {s}
                </span>
              </li>
            ))}
          </ul>
        </SubsectionCard>

        {/* 3. Growth Opportunities */}
        <SubsectionCard>
          <SubsectionHeading
            icon={<SproutIcon />}
            title="Growth Opportunities"
          />
          <ul className="space-y-3">
            {insights.growthOpportunities.map((g, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="shrink-0 mt-0.5 text-[var(--color-score-developing)]">
                  <LeafIcon />
                </span>
                <span className="text-[15px] text-solid-text-secondary leading-relaxed">
                  {g}
                </span>
              </li>
            ))}
          </ul>
        </SubsectionCard>

        {/* 4. Reflection Questions */}
        <SubsectionCard>
          <SubsectionHeading
            icon={<LightbulbIcon />}
            title="Reflection Questions"
          />
          <div className="space-y-3">
            {insights.reflectionQuestions.map((q, i) => (
              <div
                key={i}
                className="bg-solid-bg border border-solid-border rounded-lg p-4"
              >
                <p className="text-[14px] text-solid-text leading-relaxed">
                  <span className="font-semibold text-solid-accent mr-2">
                    {i + 1}.
                  </span>
                  {q}
                </p>
              </div>
            ))}
          </div>
        </SubsectionCard>

        {/* 5. Communication Recommendations */}
        <SubsectionCard>
          <SubsectionHeading
            icon={<ChatIcon />}
            title="Communication Recommendations"
          />
          <ul className="space-y-3">
            {insights.communicationRecommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="shrink-0 mt-0.5 text-solid-accent">
                  <ChatBubbleIcon />
                </span>
                <span className="text-[15px] text-solid-text-secondary leading-relaxed">
                  {r}
                </span>
              </li>
            ))}
          </ul>
        </SubsectionCard>

        {/* 6. Relationship Readiness */}
        <SubsectionCard>
          <SubsectionHeading
            icon={<HeartIcon />}
            title="Relationship Readiness"
          />
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-medium ${
                  readinessLevel === "High"
                    ? "bg-[var(--color-score-strong)]/10 text-[var(--color-score-strong)]"
                    : readinessLevel === "Moderate"
                      ? "bg-[var(--color-score-developing)]/10 text-[var(--color-score-developing)]"
                      : "bg-solid-accent-subtle text-solid-accent"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    readinessLevel === "High"
                      ? "bg-[var(--color-score-strong)]"
                      : readinessLevel === "Moderate"
                        ? "bg-[var(--color-score-developing)]"
                        : "bg-solid-accent"
                  }`}
                />
                {readinessLevel} Readiness
              </span>
            </div>
            <p className="text-[15px] text-solid-text-secondary leading-relaxed">
              {insights.relationshipReadiness.summary}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="bg-solid-bg border border-solid-border rounded-lg p-4">
                <h4 className="text-[13px] font-semibold text-[var(--color-score-strong)] mb-2">
                  Strengths
                </h4>
                <ul className="space-y-1.5">
                  {insights.relationshipReadiness.strengths.map((s, i) => (
                    <li
                      key={i}
                      className="text-[14px] text-solid-text-secondary flex items-start gap-2"
                    >
                      <span className="text-[var(--color-score-strong)] shrink-0 mt-0.5">
                        <CheckIcon small />
                      </span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-solid-bg border border-solid-border rounded-lg p-4">
                <h4 className="text-[13px] font-semibold text-[var(--color-score-developing)] mb-2">
                  Areas to Develop
                </h4>
                <ul className="space-y-1.5">
                  {insights.relationshipReadiness.areas_to_develop.map(
                    (a, i) => (
                      <li
                        key={i}
                        className="text-[14px] text-solid-text-secondary flex items-start gap-2"
                      >
                        <span className="text-[var(--color-score-developing)] shrink-0 mt-0.5">
                          <ArrowIcon />
                        </span>
                        {a}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            </div>
          </div>
        </SubsectionCard>
      </div>
    </section>
  );
}

// ── Sub-components ────────────────────────────────────────────

function SubsectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-solid-surface border border-solid-border rounded-2xl p-6 md:p-8">
      {children}
    </div>
  );
}

function SubsectionHeading({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="text-solid-accent">{icon}</span>
      <h3 className="text-[18px] font-semibold text-solid-text">{title}</h3>
    </div>
  );
}

function SkeletonBlock({ lines }: { lines: number }) {
  return (
    <div className="bg-solid-surface border border-solid-border rounded-2xl p-6 animate-pulse space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 bg-solid-border rounded"
          style={{ width: `${85 - i * 12}%` }}
        />
      ))}
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────

function SparkleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5L12 2z" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function SproutIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 20h10" />
      <path d="M12 20v-8" />
      <path d="M8 12c0-4 4-8 4-8s4 4 4 8" />
      <path d="M12 4c0 0-3 2-5 5" />
      <path d="M12 4c0 0 3 2 5 5" />
    </svg>
  );
}

function LightbulbIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function CheckIcon({ small }: { small?: boolean }) {
  const size = small ? 12 : 16;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function LeafIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  );
}

function ChatBubbleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
