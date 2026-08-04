import Link from "next/link";
import { Sparkles, ClipboardCheck, BarChart3, UserPlus, FileText } from "lucide-react";
import { getDashboardData } from "@/lib/dashboard/actions";
import { getMyPairings } from "@/lib/pairings/actions";
import { getAIInsights } from "@/lib/ai/actions";
import { StatCard } from "@/components/dashboard/StatCard";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { Avatar } from "@/components/ui/Avatar";

import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Overview",
  description: "Your SolidGround AI dashboard at a glance.",
};
export default async function DashboardPage() {
  try {
    const data = await getDashboardData();
    const pairings = await getMyPairings();
    const results = data.latestResults;
    const sessionId = data.activeSession?.id ?? data.completedSession?.id;
    let insights = null;
    if (data.completedSession?.id) { try { const r = await getAIInsights(data.completedSession.id); insights = r.insights ?? null; } catch { /* optional */ } }
    const name = data.profile?.display_name ?? data.profile?.full_name ?? "there";
    const initials = name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
    const progress = data.assessmentProgress;
    const activity = data.auditEntries;
    return <div className="max-w-[1200px]">
      <header className="mb-8 flex items-center gap-4">
        <Avatar src={data.profile?.avatar_url} alt={name} size="lg" initials={initials} />
        <div><p className="text-sm font-medium text-accent-600">SolidGround AI</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-text-primary">Welcome back, {name}</h1><p className="mt-2 text-text-secondary">Your relationship intelligence, at a glance.</p></div>
      </header>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Link href={results ? "/dashboard/scores" : "/dashboard/blueprint"}><StatCard variant="score" label={results ? "View your scores" : "Complete your Blueprint →"} score={results?.overallScore} empty={!results} /></Link>
        <Link href="/dashboard/blueprint"><StatCard variant="progress" label={progress ? `${progress.totalAnswered} of ${progress.totalQuestions} questions` : "Start Assessment →"} percentage={progress?.percentage ?? 0} empty={!progress} /></Link>
        <Link href="/dashboard/pairings"><StatCard variant="metric" value={pairings.pairings?.length ?? 0} label={pairings.pairings?.length ? "Partner alignments" : "Invite your partner →"} /></Link>
        <Link href="/dashboard/ai-insights"><StatCard variant="insight" icon={Sparkles} title={insights ? "AI insights ready" : "AI Insights"} body={insights ? "Explore your personalized relationship guidance." : results ? "Generate →" : "Complete your Blueprint first."} /></Link>
      </div>
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-card-border bg-card-bg p-6"><SectionHeader title="Recent Activity" /><div className="mt-5 space-y-4">{activity.length ? activity.map((entry) => <div key={entry.id} className="flex items-center justify-between border-b border-card-border pb-3 text-sm last:border-0"><span className="text-text-secondary">{entry.action.replace(/[._]/g, " ")}</span><time className="text-xs text-text-tertiary">{new Date(entry.created_at).toLocaleDateString()}</time></div>) : <p className="py-8 text-center text-sm text-text-tertiary">Your recent activity will appear here.</p>}</div></section>
        <section className="rounded-xl border border-card-border bg-card-bg p-6"><SectionHeader title="Quick Actions" /><div className="mt-5 grid gap-3 sm:grid-cols-2">{[[ClipboardCheck,"Take Assessment","/dashboard/blueprint"],[BarChart3,"View Results","/dashboard/scores"],[UserPlus,"Invite Partner","/dashboard/pairings"],[FileText,"View Report","/dashboard/reports"]].map(([Icon,label,href]) => { const C = Icon as typeof ClipboardCheck; return <Link key={String(label)} href={String(href)} className="flex items-center gap-3 rounded-lg border border-card-border p-4 text-sm font-medium text-text-primary transition hover:border-accent-300 hover:bg-card-hover"><C size={18} className="text-accent-600" />{String(label)}</Link> })}</div></section>
      </div>
    </div>;
  } catch { return <Empty title="We couldn't load your dashboard" body="Please try again in a moment." href="/dashboard" />; }
}
function Empty({ title, body, href }: { title: string; body: string; href: string }) { return <div className="rounded-xl border border-card-border bg-card-bg p-12 text-center"><h1 className="text-2xl font-semibold text-text-primary">{title}</h1><p className="mt-2 text-text-secondary">{body}</p><Link href={href} className="mt-6 inline-block text-sm font-medium text-accent-600">Try again →</Link></div>; }
