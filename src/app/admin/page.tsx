import { Users, UserCheck, Crown, DollarSign, ClipboardCheck, FileText, Users2, Sparkles, Coins } from "lucide-react";
import { getAdminStats } from "@/lib/admin/actions";
import { StatCard } from "@/components/dashboard/StatCard";
import { ChartContainer } from "@/components/dashboard/ChartContainer";
import { SectionHeader } from "@/components/dashboard/SectionHeader";

const formatMoney = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount / 100);
const formatNumber = (n: number) => new Intl.NumberFormat("en-US").format(n);

import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Admin Overview",
  description: "SolidGround AI admin overview.",
};
export default async function AdminOverviewPage() {
  const stats = await getAdminStats();

  return (
    <div className="max-w-[1280px]">
      <header className="mb-8">
        <p className="text-sm font-medium text-amber-600">Admin Panel</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text-primary">Platform Overview</h1>
        <p className="mt-2 text-text-secondary">Key metrics across the SolidGround platform.</p>
      </header>

      {/* Row 1: Core metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard variant="metric" label="Total Users" value={formatNumber(stats.totalUsers)} />
        <StatCard variant="metric" label="Active Users (30d)" value={formatNumber(stats.activeUsers)} />
        <StatCard variant="metric" label="Premium Users" value={formatNumber(stats.premiumUsers)} />
        <StatCard variant="metric" label="Monthly Revenue" value={formatMoney(stats.monthlyRevenue)} />
      </div>

      {/* Row 2: Engagement metrics */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard variant="metric" label="Assessment Completions" value={formatNumber(stats.assessmentCompletions)} />
        <StatCard variant="metric" label="Blueprint Reports" value={formatNumber(stats.blueprintReportsGenerated)} />
        <StatCard variant="metric" label="Partner Comparisons" value={formatNumber(stats.partnerComparisons)} />
        <StatCard variant="metric" label="AI Insights Generated" value={formatNumber(stats.aiInsightsGenerated)} />
      </div>

      {/* Row 3: API cost card */}
      <div className="mt-6">
        <ChartContainer title="API Cost Estimate" description="Estimated monthly OpenAI spend">
          <div className="flex items-center gap-4 mt-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-50">
              <Coins size={24} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-text-primary tabular-nums">
                ${stats.estimatedApiCost.toFixed(2)}
              </p>
              <p className="text-sm text-text-secondary">
                Based on {formatNumber(stats.aiInsightsGenerated)} insights at $0.0015/insight
              </p>
            </div>
          </div>
        </ChartContainer>
      </div>

      {/* Quick actions */}
      <section className="mt-8">
        <SectionHeader title="Quick Actions" />
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Users, label: "Manage Users", href: "/admin/users" },
            { icon: FileText, label: "View Reports", href: "/admin/reports" },
            { icon: Sparkles, label: "AI Prompts", href: "/admin/ai-prompts" },
            { icon: FileText, label: "Audit Log", href: "/admin/audit" },
          ].map(({ icon: Icon, label, href }) => (
            <a
              key={label}
              href={href}
              className="flex items-center gap-3 rounded-lg border border-card-border bg-card-bg p-4 text-sm font-medium text-text-primary transition hover:border-amber-300 hover:bg-amber-50/30"
            >
              <Icon size={18} className="text-amber-600" />
              {label}
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
