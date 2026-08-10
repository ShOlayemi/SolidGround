import { Suspense } from "react";
import { AlertTriangle, UserX } from "lucide-react";
import { getUsers } from "@/lib/admin/actions";
import { ChartContainer } from "@/components/dashboard/ChartContainer";
import { UserSearch } from "./UserSearch";
import { RoleSelect } from "./RoleSelect";
import { UsersPagination } from "./UsersPagination";
import type { AdminProfile } from "@/types";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "User Management",
  description: "Manage SolidGround AI users, roles, and access.",
};

const LIMIT = 20;

interface PageProps {
  searchParams: Promise<{ search?: string; role?: string; page?: string }>;
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const search = params.search ?? "";
  const role = params.role ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  let usersData: { users: AdminProfile[]; total: number };
  let fetchError: string | null = null;

  try {
    usersData = await getUsers({ search: search || undefined, role: role || undefined, page, limit: LIMIT });
  } catch (err) {
    fetchError = err instanceof Error ? err.message : "Failed to load users";
    usersData = { users: [], total: 0 };
  }

  const { users, total } = usersData;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const tierBadge = (tier: string) => {
    if (tier === "premium_monthly" || tier === "premium_annual") {
      return (
        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
          Premium
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
        Free
      </span>
    );
  };

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

      {/* Search + filter bar */}
      <div className="mb-6">
        <Suspense fallback={null}>
          <UserSearch defaultValue={search} />
        </Suspense>
      </div>

      {/* Results */}
      <ChartContainer
        title={`All Users${total > 0 ? ` (${total})` : ""}`}
        description="Search, view, and manage user accounts"
        error={fetchError ?? undefined}
        empty={!fetchError && users.length === 0}
      >
        {fetchError ? (
          <div
            className="flex flex-col items-center gap-3 py-12 text-center"
            role="alert"
          >
            <AlertTriangle size={28} className="text-red-400" />
            <p className="text-sm text-text-secondary">
              Failed to load users: {fetchError}
            </p>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <UserX size={28} className="text-text-tertiary" />
            <p className="text-sm text-text-secondary">
              {search
                ? `No users matching "${search}"`
                : "No users found on the platform yet."}
            </p>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-card-border">
                    <th className="py-3 pr-4 font-medium text-text-secondary">
                      Name
                    </th>
                    <th className="py-3 pr-4 font-medium text-text-secondary">
                      Email
                    </th>
                    <th className="py-3 pr-4 font-medium text-text-secondary">
                      Role
                    </th>
                    <th className="py-3 pr-4 font-medium text-text-secondary">
                      Plan
                    </th>
                    <th className="py-3 pr-4 font-medium text-text-secondary">
                      Blueprint
                    </th>
                    <th className="py-3 font-medium text-text-secondary">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-card-border/60 transition hover:bg-amber-50/20"
                    >
                      <td className="py-3 pr-4">
                        <span className="font-medium text-text-primary">
                          {user.displayName}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-text-secondary">
                        {user.email || "—"}
                      </td>
                      <td className="py-3 pr-4">
                        <RoleSelect userId={user.id} currentRole={user.role} />
                      </td>
                      <td className="py-3 pr-4">
                        {tierBadge(user.subscriptionTier)}
                      </td>
                      <td className="py-3 pr-4">
                        {user.blueprintCompleted ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Complete
                          </span>
                        ) : (
                          <span className="text-xs text-text-tertiary">
                            —
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-text-tertiary">
                        {formatDate(user.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="border-t border-card-border pt-4">
              <Suspense fallback={null}>
                <UsersPagination
                  currentPage={page}
                  totalPages={totalPages}
                />
              </Suspense>
            </div>
          </>
        )}
      </ChartContainer>
    </div>
  );
}
