import { Users } from "lucide-react";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { ChartContainer } from "@/components/dashboard/ChartContainer";

import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "User Management",
  description: "Manage SolidGround AI users.",
};
export default async function AdminUsersPage() {
  return (
    <div className="max-w-[1280px]">
      <header className="mb-8">
        <p className="text-sm font-medium text-amber-600">Admin Panel</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text-primary">Users</h1>
        <p className="mt-2 text-text-secondary">Manage platform users, roles, and access.</p>
      </header>

      <ChartContainer title="User Management" description="Search and manage user accounts">
        <div className="mt-4 flex items-center justify-center py-12 text-sm text-text-tertiary">
          <Users size={20} className="mr-2 text-amber-400" />
          User list coming in Sprint 8.2 — user search, role management, and bulk actions.
        </div>
      </ChartContainer>
    </div>
  );
}
