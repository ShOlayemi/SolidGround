import Link from "next/link";
import { getDashboardData } from "@/lib/dashboard/actions";
import { ScoreRing } from "@/components/dashboard/ScoreRing";
import { CategoryBar } from "@/components/dashboard/CategoryBar";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { DownloadPdfButton } from "@/components/dashboard/DownloadPdfButton";
import { SCORE_BANDS } from "@/lib/scoring/scoring-config";

import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Scores",
  description: "Your category scores, strengths, and growth areas.",
};
export default async function ScoresPage() {
  try {
    const { latestResults } = await getDashboardData();
    if (!latestResults) return <Empty />;
    const flags = latestResults.categoryResults.filter((c) => c.dealBreakerTriggered);
    return <div className="max-w-[1200px]"><header className="mb-8"><h1 className="text-3xl font-semibold tracking-tight text-text-primary">Scores</h1><p className="mt-2 text-text-secondary">A clear view of your compatibility profile.</p></header><section className="rounded-xl border border-card-border bg-card-bg p-8 text-center"><ScoreRing score={latestResults.overallScore} confidence={latestResults.overallConfidence} size="lg" label="overall" /><h2 className="mt-5 text-xl font-semibold text-text-primary">Your Compatibility Score</h2><p className="mt-1 text-sm text-text-secondary">Based on your completed Blueprint assessment.</p><div className="mt-6 flex justify-center"><DownloadPdfButton endpoint="/api/reports/blueprint" /></div></section><section className="mt-10"><SectionHeader title="Category Scores" /><div className="mt-6 grid gap-6 md:grid-cols-2">{latestResults.categoryResults.map((c) => <div key={c.category}><CategoryBar label={c.label} score={c.score} />{c.questionsAnswered !== c.totalQuestions && <p className="mt-1 text-xs text-text-tertiary">{c.questionsAnswered}/{c.totalQuestions} answered</p>}</div>)}</div></section><details className="mt-6 rounded-xl border border-card-border bg-card-bg px-5 py-4 text-sm text-text-secondary"><summary className="cursor-pointer font-medium text-text-primary">What do these scores mean?</summary><div className="mt-3 space-y-2">{SCORE_BANDS.map((band) => <p key={band.label}><strong className="text-text-primary">{band.min}–{band.max}: {band.label}</strong> — {band.description}</p>)}</div></details>{flags.length > 0 && <section className="mt-10"><SectionHeader title="Areas to discuss" /><div className="mt-5 space-y-3">{flags.map((c) => <div key={c.category} className="rounded-xl border border-warning-200 bg-warning-50 p-4 text-sm text-warning-700"><strong>{c.label}</strong> surfaced a potential deal-breaker worth reflecting on together.</div>)}</div></section>}</div>;
  } catch { return <Empty error />; }
}
function Empty({ error = false }: { error?: boolean }) { return <div className="rounded-xl border border-dashed border-card-border bg-card-bg p-12 text-center"><h1 className="text-2xl font-semibold text-text-primary">{error ? "Unable to load scores" : "Complete your Blueprint to see your scores"}</h1><p className="mt-2 text-text-secondary">{error ? "Please try again in a moment." : "Your category breakdown will appear here after you finish."}</p><Link href={error ? "/dashboard/scores" : "/dashboard/blueprint"} className="mt-6 inline-block text-sm font-medium text-accent-600">{error ? "Try again →" : "Start Blueprint →"}</Link></div>; }
