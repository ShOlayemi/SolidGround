import { ChartContainer } from "@/components/dashboard/ChartContainer";

export default function AdminUsersLoading() {
  return (
    <div className="max-w-[1280px]">
      <header className="mb-8">
        <p className="text-sm font-medium text-amber-600">Admin Panel</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text-primary">
          Users
        </h1>
        <p className="mt-2 text-text-secondary">
          Manage platform users, roles, and access.
        </p>
      </header>

      <ChartContainer title="All Users" loading>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-card-border">
                {["Name", "Email", "Role", "Plan", "Blueprint", "Joined"].map(
                  (col) => (
                    <th
                      key={col}
                      className="py-3 pr-4 font-medium text-text-secondary"
                    >
                      {col}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }, (_, i) => (
                <tr key={i} className="border-b border-card-border/60">
                  {Array.from({ length: 6 }, (_, j) => (
                    <td key={j} className="py-3 pr-4">
                      <div className="h-4 animate-pulse rounded bg-slate-200" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartContainer>
    </div>
  );
}
