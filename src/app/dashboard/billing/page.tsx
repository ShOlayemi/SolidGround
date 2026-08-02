import Link from "next/link";
import { Check } from "lucide-react";
import { getBillingOverview } from "@/lib/billing/actions";
import { PLANS } from "@/lib/billing/plans";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { ChartContainer } from "@/components/dashboard/ChartContainer";

const formatMoney = (amount: number, currency = "usd") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount / 100);

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(date));

function ProgressBar({ label, current, limit }: { label: string; current: number; limit: number }) {
  const unlimited = limit === -1;
  const percent = unlimited ? 8 : Math.min(100, (current / Math.max(limit, 1)) * 100);
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span className="text-text-secondary">{label}</span>
        <span className="font-medium text-text-primary">
          {current} / {unlimited ? "Unlimited" : limit}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-card-border" role="progressbar" aria-label={`${label} usage`} aria-valuenow={current} aria-valuemin={0} aria-valuemax={unlimited ? Math.max(current, 1) : limit}>
        <div aria-hidden="true" className="h-full rounded-full bg-accent-500" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Billing & Subscription",
  description: "Manage your SolidGround AI plan and billing.",
};
export default async function BillingPage() {
  const overview = await getBillingOverview();
  const { currentPlan, usageStats } = overview;

  return (
    <div className="max-w-[1120px] space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary">Billing &amp; Plan</h1>
        <p className="mt-2 text-text-secondary">Manage your plan, usage, and billing history.</p>
      </header>

      <ChartContainer title="Current plan" description="Your SolidGround membership">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-2xl font-semibold text-text-primary">{currentPlan.name}</p>
            <p className="mt-1 text-text-secondary">Free — all core features included</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-accent-100 px-3 py-1 text-xs font-medium text-accent-700">
              active
            </span>
          </div>
        </div>
      </ChartContainer>

      <section id="plans">
        <SectionHeader title="Premium Plans" />
        <p className="mt-2 text-sm text-text-secondary">
          Premium plans are coming soon. Stripe integration is being finalized.
        </p>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {Object.values(PLANS)
            .filter((p) => p.tier !== "free")
            .map((plan) => (
              <div
                key={plan.tier}
                className="rounded-xl border border-card-border bg-card-bg p-6 opacity-60"
              >
                <h3 className="text-lg font-semibold text-text-primary">{plan.name}</h3>
                <p className="mt-3 text-3xl font-bold text-text-primary">
                  {formatMoney(plan.price)}
                  <span className="text-sm font-normal text-text-tertiary">
                    /{plan.interval}
                  </span>
                </p>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2 text-sm text-text-secondary">
                      <Check size={16} className="mt-0.5 shrink-0 text-accent-600" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <p className="mt-7 rounded-lg border border-dashed border-card-border px-4 py-2.5 text-center text-sm text-text-tertiary">
                  Coming soon
                </p>
              </div>
            ))}
        </div>
      </section>

      <section>
        <SectionHeader title="Usage" />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <StatCard variant="metric" label="Blueprints completed" value={usageStats.blueprintsCompleted} />
          <StatCard variant="metric" label="AI insights used" value={usageStats.aiInsightsUsed} />
        </div>
        <ChartContainer title="Usage limits" className="mt-4">
          <div className="space-y-5">
            <ProgressBar
              label="Blueprint assessments"
              current={usageStats.blueprintsCompleted}
              limit={usageStats.blueprintLimit}
            />
            <ProgressBar
              label="AI insights"
              current={usageStats.aiInsightsUsed}
              limit={usageStats.aiInsightLimit}
            />
          </div>
        </ChartContainer>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <ChartContainer title="Payment history">
          <p className="py-5 text-sm text-text-tertiary">Available when premium plans launch.</p>
        </ChartContainer>
        <ChartContainer title="Invoice history">
          <p className="py-5 text-sm text-text-tertiary">Available when premium plans launch.</p>
        </ChartContainer>
      </section>
    </div>
  );
}
