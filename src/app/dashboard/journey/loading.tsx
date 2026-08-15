// Journey dashboard loading state — lightweight skeletons while the
// server action resolves (matches the admin/users loading convention).
export default function JourneyDashboardLoading() {
  return (
    <div className="mx-auto max-w-[960px]" aria-busy="true">
      <div className="mb-8">
        <div className="h-8 w-32 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-4 w-72 max-w-full animate-pulse rounded bg-slate-200" />
      </div>
      <div className="rounded-xl border border-card-border bg-card-bg p-6">
        <div className="h-5 w-44 animate-pulse rounded bg-slate-200" />
        <div className="mt-5 h-2.5 w-full animate-pulse rounded-full bg-slate-200" />
        <div className="mt-6 grid grid-cols-3 gap-4 border-t border-card-border pt-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-7 w-12 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-10 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[72px] animate-pulse rounded-xl bg-slate-200" />
        ))}
      </div>
    </div>
  );
}
