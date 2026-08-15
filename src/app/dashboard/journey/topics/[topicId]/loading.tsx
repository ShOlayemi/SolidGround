// Journey topic detail loading state — skeleton while the server action
// resolves (matches the admin/users loading convention).
export default function JourneyTopicLoading() {
  return (
    <div className="mx-auto max-w-[760px]" aria-busy="true">
      <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
      <div className="mt-4 h-8 w-3/4 max-w-full animate-pulse rounded bg-slate-200" />
      <div className="mt-3 h-5 w-24 animate-pulse rounded-full bg-slate-200" />
      <div className="mt-8 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-200" />
        ))}
      </div>
    </div>
  );
}
