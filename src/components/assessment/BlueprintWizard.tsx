"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  QUESTIONS,
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  getQuestionsByCategory,
} from "@/lib/assessment/questions";
import {
  saveAnswer,
  completeSession,
} from "@/lib/assessment/actions";
import { acceptInvite } from "@/lib/pairings/actions";
import { computeResults } from "@/lib/scoring/actions";
import type {
  AssessmentSession,
  AssessmentAnswer,
  AssessmentCategory,
} from "@/types";
import { QuestionCard } from "./QuestionCard";
import { CategorySidebar } from "./CategorySidebar";
import { AssessmentProgressBar } from "./AssessmentProgressBar";
import { ResetSessionButton } from "./ResetSessionButton";
import { Button } from "@/components/ui/Button";
import { trackEvent } from "@/lib/analytics/events";

/* ── Types ────────────────────────────────────────────────── */

type WizardState = "answering" | "category_complete" | "all_complete";

interface WizardProps {
  session: AssessmentSession;
  initialAnswers: AssessmentAnswer[];
  inviteCode?: string;
}

/* ── Derived data ─────────────────────────────────────────── */

interface CategoryProgressData {
  category: AssessmentCategory;
  label: string;
  answered: number;
  total: number;
  complete: boolean;
}

interface FlatQuestion {
  question: (typeof QUESTIONS)[number];
  flatIndex: number;
  categoryIndex: number; // which category (0-11) this question belongs to
}

// Build flat question list in category order
const FLAT_QUESTIONS: FlatQuestion[] = [];
let idx = 0;
for (let ci = 0; ci < CATEGORY_ORDER.length; ci++) {
  const cat = CATEGORY_ORDER[ci];
  const qs = getQuestionsByCategory(cat);
  for (const q of qs) {
    FLAT_QUESTIONS.push({ question: q, flatIndex: idx, categoryIndex: ci });
    idx++;
  }
}

/* ── Helpers ──────────────────────────────────────────────── */

function computeCategoryProgress(
  answers: Map<string, unknown>,
): CategoryProgressData[] {
  return CATEGORY_ORDER.map((cat) => {
    const qs = getQuestionsByCategory(cat);
    const total = qs.length;
    const answered = qs.filter((q) => answers.has(q.id)).length;
    return {
      category: cat,
      label: CATEGORY_LABELS[cat],
      answered,
      total,
      complete: answered >= total,
    };
  });
}

function findFirstUnansweredInCategory(
  cat: AssessmentCategory,
  answers: Map<string, unknown>,
): number {
  const qs = getQuestionsByCategory(cat);
  for (let i = 0; i < qs.length; i++) {
    if (!answers.has(qs[i].id)) return i;
  }
  return qs.length - 1; // all answered, return last
}

function findCategoryStartFlatIndex(cat: AssessmentCategory): number {
  const fq = FLAT_QUESTIONS.find((f) => f.question.category === cat);
  return fq ? fq.flatIndex : 0;
}

/* ── Component ────────────────────────────────────────────── */

export function BlueprintWizard({ session, initialAnswers, inviteCode }: WizardProps) {
  const router = useRouter();

  // Build answers map from initial data
  const [answers, setAnswers] = useState<Map<string, unknown>>(() => {
    const m = new Map<string, unknown>();
    for (const a of initialAnswers) {
      m.set(a.question_id, a.answer);
    }
    return m;
  });

  // Determine starting question
  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    // Find first unanswered question
    for (let i = 0; i < FLAT_QUESTIONS.length; i++) {
      if (!answers.has(FLAT_QUESTIONS[i].question.id)) return i;
    }
    return FLAT_QUESTIONS.length - 1;
  });

  const [wizardState, setWizardState] = useState<WizardState>(() => {
    // Check if all are answered
    if (answers.size >= FLAT_QUESTIONS.length) return "all_complete";
    return "answering";
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const currentFlat = FLAT_QUESTIONS[currentIndex];
  const currentQuestion = currentFlat.question;

  // Category progress
  const categoryProgress = useMemo(
    () => computeCategoryProgress(answers),
    [answers],
  );

  // Overall progress
  const totalAnswered = answers.size;
  const totalQuestions = FLAT_QUESTIONS.length;
  const percentage =
    totalQuestions > 0
      ? Math.round((totalAnswered / totalQuestions) * 100)
      : 0;

  // Current category info
  const currentCatQuestions = getQuestionsByCategory(currentQuestion.category);
  const currentCatQuestionIndex =
    currentCatQuestions.findIndex((q) => q.id === currentQuestion.id) + 1;
  const currentCatTotal = currentCatQuestions.length;

  // Is current question the last in its category?
  const isLastInCategory =
    currentCatQuestionIndex >= currentCatTotal;

  // Is current question the last overall?
  const isLastOverall = currentIndex >= FLAT_QUESTIONS.length - 1;

  // Current answer value
  const currentAnswer = answers.get(currentQuestion.id) ?? null;

  /* ── Save ──────────────────────────────────────────────── */

  const doSave = useCallback(
    async (questionId: string, answer: unknown) => {
      const q = FLAT_QUESTIONS.find((f) => f.question.id === questionId);
      if (!q) return;

      setIsSaving(true);
      setSaveError(null);
      try {
        const result = await saveAnswer(
          session.id,
          questionId,
          q.question.category,
          answer,
        );
        if (!result.success) {
          setSaveError(result.error ?? "Failed to save");
        }
      } catch {
        setSaveError("Network error. Your answer will be saved when you continue.");
      } finally {
        setIsSaving(false);
      }
    },
    [session.id],
  );

  /* ── Handle answer change ──────────────────────────────── */

  const handleAnswerChange = useCallback(
    (value: unknown) => {
      const qId = currentQuestion.id;
      setAnswers((prev) => {
        const next = new Map(prev);
        next.set(qId, value);
        return next;
      });

      // Debounced save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        doSave(qId, value);
      }, 800);
    },
    [currentQuestion.id, doSave],
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  /* ── Navigation ────────────────────────────────────────── */

  const saveCurrentAndNavigate = useCallback(
    async (direction: "next" | "prev") => {
      const qId = currentQuestion.id;
      const answer = answers.get(qId);

      if (answer !== undefined && answer !== null) {
        // Clear any pending debounced save
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = null;
        }
        await doSave(qId, answer);
      }

      if (direction === "next") {
        // Check if we're completing a category
        if (isLastInCategory && !isLastOverall) {
          setWizardState("category_complete");
          // Auto-advance after 2 seconds
          setTimeout(() => {
            setCurrentIndex((prev) => prev + 1);
            setWizardState("answering");
          }, 2000);
          return;
        }

        // Last question overall
        if (isLastOverall) {
          setWizardState("all_complete");
          return;
        }

        setCurrentIndex((prev) => prev + 1);
      } else {
        setCurrentIndex((prev) => Math.max(0, prev - 1));
      }
    },
    [currentQuestion.id, answers, doSave, isLastInCategory, isLastOverall],
  );

  /* ── Category sidebar click ────────────────────────────── */

  const handleSelectCategory = useCallback(
    (cat: AssessmentCategory) => {
      const catStart = findCategoryStartFlatIndex(cat);
      const unansweredOffset = findFirstUnansweredInCategory(cat, answers);
      const qs = getQuestionsByCategory(cat);
      // Find the flat index of this specific question
      const targetQId = qs[unansweredOffset]?.id;
      const targetFlat = FLAT_QUESTIONS.find(
        (f) => f.question.id === targetQId,
      );
      if (targetFlat) {
        // Save current before navigating
        const currentAnswer = answers.get(currentQuestion.id);
        if (currentAnswer !== undefined && currentAnswer !== null) {
          if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
          }
          doSave(currentQuestion.id, currentAnswer);
        }
        setCurrentIndex(targetFlat.flatIndex);
        setWizardState("answering");
      }
    },
    [answers, currentQuestion.id, doSave],
  );

  /* ── Completion effect ─────────────────────────────────── */

  const [isComputing, setIsComputing] = useState(false);

  useEffect(() => {
    if (wizardState === "all_complete") {
      const finish = async () => {
        setIsComputing(true);
        try {
          await completeSession(session.id);
          // Auto-compute results immediately after marking complete
          const computeResult = await computeResults(session.id);
          if (computeResult.success) {
            trackEvent("assessment_completed", { score: computeResult.results?.overallScore ?? 0, categories_completed: CATEGORY_ORDER.length });
            if (inviteCode) {
              const acceptResult = await acceptInvite(inviteCode);
              if (acceptResult.success && acceptResult.pairingId) {
                router.push(`/dashboard/pairings/${acceptResult.pairingId}`);
                return;
              }
              console.error("Failed to accept pairing invite after assessment:", acceptResult.error);
            }
            router.push(
              `/dashboard/blueprint/results?sessionId=${session.id}`,
            );
          } else {
            console.error("Failed to compute results:", computeResult.error);
            router.push("/dashboard/blueprint");
          }
        } catch (err) {
          console.error("Completion error:", err);
          router.push("/dashboard/blueprint");
        }
      };
      finish();
    }
  }, [wizardState, session.id, router]);

  /* ── Keyboard navigation ───────────────────────────────── */

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (wizardState !== "answering") return;
      if (e.key === "ArrowLeft" || (e.key === "ArrowUp" && e.metaKey)) {
        e.preventDefault();
        if (currentIndex > 0) {
          saveCurrentAndNavigate("prev");
        }
      }
      // Don't auto-advance on arrow right — user must click Next
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [wizardState, currentIndex, saveCurrentAndNavigate]);

  /* ── Category complete interstitial ────────────────────── */

  if (wizardState === "category_complete") {
    const completedCategory = currentQuestion.category;
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
        <div className="w-16 h-16 rounded-full bg-solid-accent-subtle flex items-center justify-center">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-solid-accent"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <div>
          <h2 className="text-[24px] font-semibold tracking-tight text-solid-text mb-1">
            {CATEGORY_LABELS[completedCategory]} complete
          </h2>
          <p className="text-[15px] text-solid-text-secondary">
            Moving to the next category…
          </p>
        </div>
        <div className="w-48 h-1 rounded-full bg-solid-border overflow-hidden">
          <div className="h-full rounded-full bg-solid-accent animate-[progress_2s_ease-in-out]" />
        </div>
      </div>
    );
  }

  /* ── All complete ──────────────────────────────────────── */

  if (wizardState === "all_complete") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 text-center px-4">
        {/* Animated checkmark */}
        <div className="relative w-20 h-20">
          <svg
            width="80"
            height="80"
            viewBox="0 0 80 80"
            fill="none"
            className="absolute inset-0"
          >
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              className="text-solid-accent"
            />
            <path
              d="M24 40 l12 12 l20-24"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-solid-accent"
              strokeDasharray="60"
              strokeDashoffset="60"
              style={{
                animation: "check-draw 0.6s ease-out 0.2s forwards",
              }}
            />
          </svg>
        </div>

        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-solid-text mb-2">
            Blueprint Complete
          </h1>
          <p className="text-[16px] text-solid-text-secondary max-w-md">
            You&apos;ve answered all {totalQuestions} questions across{" "}
            {CATEGORY_ORDER.length} dimensions.
          </p>
          {isComputing && (
            <p className="text-[14px] text-solid-text-tertiary mt-3 animate-pulse">
              Computing your Compatibility Blueprint…
            </p>
          )}
        </div>

        <ResetSessionButton
          variant="link"
          label="Start a New Assessment"
          description="Your results are being saved — you can start fresh any time."
        />
      </div>
    );
  }

  /* ── Answering state ───────────────────────────────────── */

  const hasCurrentAnswer =
    currentAnswer !== null && currentAnswer !== undefined;

  return (
    <div className="flex flex-col h-full">
      {/* Progress bar at top */}
      <div className="mb-8">
        <AssessmentProgressBar
          currentQuestion={currentIndex + 1}
          totalQuestions={totalQuestions}
          percentage={percentage}
        />
      </div>

      {/* Two-column layout */}
      <div className="flex min-w-0 flex-1 flex-col gap-0 md:flex-row">
        {/* Category sidebar */}
        <CategorySidebar
          categories={categoryProgress}
          currentCategory={currentQuestion.category}
          answeredQuestionIds={
            new Set(Array.from(answers.keys()))
          }
          onSelectCategory={handleSelectCategory}
        />

        {/* Main question area */}
        <div className="flex-1 md:pl-8 min-w-0">
          <div className="max-w-[640px]">
            {/* Question */}
            <QuestionCard
              question={currentQuestion}
              value={currentAnswer}
              onChange={handleAnswerChange}
              error={saveError ?? undefined}
              questionNumber={currentCatQuestionIndex}
              totalInCategory={currentCatTotal}
            />

            {/* Navigation */}
            <div className="mt-8 flex flex-col-reverse items-stretch gap-3 border-t border-solid-border pt-6 sm:flex-row sm:items-center sm:justify-between">
              <Button
                variant="ghost"
                size="md"
                className="min-h-11 w-full sm:w-auto"
                onClick={() => saveCurrentAndNavigate("prev")}
                disabled={currentIndex === 0 || isSaving}
              >
                ← Previous
              </Button>

              <Button
                variant="filled"
                size="md"
                className="min-h-11 w-full sm:w-auto"
                onClick={() => saveCurrentAndNavigate("next")}
                disabled={!hasCurrentAnswer || isSaving}
              >
                {isSaving
                  ? "Saving…"
                  : isLastOverall
                    ? "See Your Results"
                    : isLastInCategory
                      ? `Complete ${CATEGORY_LABELS[currentQuestion.category]} →`
                      : "Next →"}
              </Button>
            </div>

            {/* Save indicator */}
            <p className="text-[12px] text-solid-text-tertiary text-center mt-4">
              {isSaving
                ? "Saving…"
                : "Your answers are saved automatically"}
            </p>
          </div>
        </div>
      </div>

      {/* Keyframe styles for animations */}
      <style jsx>{`
        @keyframes check-draw {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}
