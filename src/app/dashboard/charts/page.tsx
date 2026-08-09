import Link from "next/link";
import { getDashboardData } from "@/lib/dashboard/actions";
import { ChartContainer } from "@/components/dashboard/ChartContainer";
import { CategoryBar } from "@/components/dashboard/CategoryBar";
import { partnerLabel } from "@/lib/mode";
import type { RelationshipType } from "@/types";

import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Charts",
  description: "Visual breakdown of your compatibility scores.",
};

export default async function ChartsPage() {
  let latestResults: Awaited<ReturnType<typeof getDashboardData>>["latestResults"] = null;
  let error = false;
  let mode: RelationshipType | undefined = undefined;

  try {
    const data = await getDashboardData();
    latestResults = data.latestResults;
    mode = data.completedSession?.mode ?? data.activeSession?.mode;
  } catch {
    error = true;
  }

  const pLabel = partnerLabel(mode);

  if (error || !latestResults) {
    return <Empty error={error} />;
  }

  const categories = [...latestResults.categoryResults].sort(
    (a, b) => b.score - a.score,
  );
  const high = categories.filter((c) => c.score >= 70).length;
  const mid = categories.filter((c) => c.score >= 40 && c.score < 70).length;
  const low = categories.filter((c) => c.score < 40).length;
  const total = categories.length || 1;

  return (
    <div className="max-w-[1200px]">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
          Charts
        </h1>
        <p className="mt-2 text-text-secondary">
          Patterns across your compatibility profile.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartContainer
          title="Category Distribution"
          description="Your strongest and developing areas, ranked."
        >
          <div className="space-y-5">
            {categories.map((c) => (
              <CategoryBar
                key={c.category}
                label={c.label}
                score={c.score}
              />
            ))}
          </div>
        </ChartContainer>

        <div className="space-y-6">
          <ChartContainer
            title="Score Breakdown"
            description="Categories grouped by score range."
          >
            <div className="space-y-4">
              <div className="flex h-4 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="bg-success-600"
                  style={{ width: `${(high / total) * 100}%` }}
                />
                <div
                  className="bg-warning-600"
                  style={{ width: `${(mid / total) * 100}%` }}
                />
                <div
                  className="bg-danger-600"
                  style={{ width: `${(low / total) * 100}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-text-secondary">
                <span>High · {high}</span>
                <span>Moderate · {mid}</span>
                <span>Developing · {low}</span>
              </div>
            </div>
          </ChartContainer>

          <ChartContainer
            title="Comparison Readiness"
            description={`Pair with a ${pLabel} to see comparison charts.`}
          >
            <Link
              href="/dashboard/pairings"
              className="inline-block text-sm font-medium text-accent-600"
            >
              Invite a {pLabel} &rarr;
            </Link>
          </ChartContainer>
        </div>
      </div>
    </div>
  );
}

function Empty({ error = false }: { error?: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-card-border bg-card-bg p-12 text-center">
      <h1 className="text-2xl font-semibold text-text-primary">
        {error
          ? "Unable to load charts"
          : "Complete your Blueprint to explore charts"}
      </h1>
      <p className="mt-2 text-text-secondary">
        {error
          ? "Please try again in a moment."
          : "Visual insights will appear after your assessment."}
      </p>
      <Link
        href={error ? "/dashboard/charts" : "/dashboard/blueprint"}
        className="mt-6 inline-block text-sm font-medium text-accent-600"
      >
        {error ? "Try again →" : "Start Blueprint →"}
      </Link>
    </div>
  );
}
