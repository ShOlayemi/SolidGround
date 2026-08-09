import Link from "next/link";
import { getDashboardData } from "@/lib/dashboard/actions";
import { getAIInsights } from "@/lib/ai/actions";
import { InsightCard } from "@/components/dashboard/InsightCard";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { checkAccess } from "@/lib/billing/middleware";
import { UpgradePrompt } from "@/components/billing/UpgradePrompt";
import { DownloadPdfButton } from "@/components/dashboard/DownloadPdfButton";
import { blueprintLabel } from "@/lib/mode";
import type { RelationshipType } from "@/types";

import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Reports",
  description: "Your compatibility reports and summaries.",
};
export default async function ReportsPage() {
  try {
    const { latestResults, completedSession } = await getDashboardData();
    if (!latestResults) return <Empty />;
    const sorted = [...latestResults.categoryResults].sort((a, b) => b.score - a.score);
    const access = await checkAccess("pdfExports");
    const mode: RelationshipType | undefined = completedSession?.mode;
    const bLabel = blueprintLabel(mode);
    let insight = null;
    if (completedSession) { try { const r = await getAIInsights(completedSession.id); insight = r.insights ?? null; } catch { /* optional */ } }
    return <div className="max-w-[1000px]"><header className="mb-8"><h1 className="text-3xl font-semibold tracking-tight text-text-primary">Your Report</h1><p className="mt-2 text-text-secondary">A considered summary of your Blueprint results.</p></header><section className="rounded-xl border border-card-border bg-card-bg p-6"><SectionHeader title="Summary" /><div className="mt-6 flex flex-wrap items-start gap-10"><div><p className="text-xs font-medium uppercase tracking-wider text-text-tertiary">Overall score</p><p className="mt-2 text-5xl font-bold tabular-nums text-text-primary">{latestResults.overallScore}<span className="text-xl text-text-tertiary">/100</span></p></div><div className="grid gap-6 sm:grid-cols-2"><div><h3 className="font-semibold text-text-primary">Top strengths</h3><ul className="mt-2 space-y-1 text-sm text-text-secondary">{sorted.slice(0, 3).map((c) => <li key={c.category}>• {c.label} ({c.score}%)</li>)}</ul></div><div><h3 className="font-semibold text-text-primary">Growth areas</h3><ul className="mt-2 space-y-1 text-sm text-text-secondary">{sorted.slice(-3).reverse().map((c) => <li key={c.category}>• {c.label} ({c.score}%)</li>)}</ul></div></div></div></section>{access.allowed ? <>{insight && <div className="mt-6"><InsightCard title="AI summary">{insight.blueprintSummary}</InsightCard></div>}<section className="mt-8 rounded-xl border border-card-border bg-card-bg p-6"><SectionHeader title="Export report" /><div className="mt-5 flex flex-wrap gap-3"><DownloadPdfButton endpoint="/api/reports/blueprint" /><DownloadPdfButton endpoint="/api/reports/relationship" label={`Download ${bLabel}`} /><button disabled className="rounded-lg border border-card-border px-4 py-2 text-sm text-text-tertiary">Share Report <span className="ml-2 text-xs">Coming soon</span></button></div></section></> : <div className="mt-6"><UpgradePrompt feature="AI summaries and PDF exports" /></div>}</div>;
  } catch { return <Empty error />; }
}
function Empty({ error = false }: { error?: boolean }) { return <div className="rounded-xl border border-dashed border-card-border bg-card-bg p-12 text-center"><h1 className="text-2xl font-semibold text-text-primary">{error ? "Unable to load your report" : "Complete your Blueprint to generate a report"}</h1><p className="mt-2 text-text-secondary">{error ? "Please try again in a moment." : "Your summary and insights will appear here."}</p><Link href={error ? "/dashboard/reports" : "/dashboard/blueprint"} className="mt-6 inline-block text-sm font-medium text-accent-600">{error ? "Try again →" : "Start Blueprint →"}</Link></div>; }
