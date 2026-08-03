import { redirect } from "next/navigation";
import { getOrCreateSession, getAnswers } from "@/lib/assessment/actions";
import { BlueprintWizardLazy } from "@/components/assessment/BlueprintWizardLazy";
import { AnalyticsPageView } from "@/components/analytics/PageView";
import { CATEGORY_ORDER } from "@/lib/assessment/questions";

import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Blueprint Assessment",
  description: "Complete your Compatibility Blueprint™ assessment.",
};
interface AssessPageProps {
  searchParams: Promise<{ inviteCode?: string }>;
}

export default async function AssessPage({ searchParams }: AssessPageProps) {
  const { inviteCode } = await searchParams;
  // Get or create session
  const sessionResult = await getOrCreateSession();

  if (!sessionResult.success || !sessionResult.session) {
    return (
      <div className="max-w-[640px] mx-auto py-20 px-4 text-center">
        <h1 className="text-[24px] font-semibold text-solid-text mb-3">
          Unable to start assessment
        </h1>
        <p className="text-[15px] text-solid-text-secondary mb-6">
          {sessionResult.error ?? "Something went wrong. Please try again."}
        </p>
        <a
          href="/dashboard/blueprint"
          className="text-[14px] font-medium text-solid-accent hover:text-solid-accent-hover transition-colors"
        >
          ← Back to Blueprint
        </a>
      </div>
    );
  }

  const session = sessionResult.session;

  // If already completed, redirect
  if (session.status === "completed") {
    redirect("/dashboard");
  }

  // Fetch existing answers
  const answersResult = await getAnswers(session.id);
  const answers = answersResult.success && answersResult.answers ? answersResult.answers : [];

  return (
    <div className="max-w-[960px]">
      <AnalyticsPageView name="assessment_started" properties={{ category_count: CATEGORY_ORDER.length }} />
      <BlueprintWizardLazy session={session} initialAnswers={answers} inviteCode={inviteCode} />
    </div>
  );
}
