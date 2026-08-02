import { Shield } from "lucide-react";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { ChartContainer } from "@/components/dashboard/ChartContainer";

import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Audit Log",
  description: "Audit log of admin and system actions.",
};
export default async function AdminAuditPage() {
  return (
    <div className="max-w-[1280px]">
      <header className="mb-8">
        <p className="text-sm font-medium text-amber-600">Admin Panel</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text-primary">Audit Log</h1>
        <p className="mt-2 text-text-secondary">Track all administrative actions on the platform.</p>
      </header>

      <ChartContainer title="Admin Audit Trail" description="Chronological log of admin actions">
        <div className="mt-4 flex items-center justify-center py-12 text-sm text-text-tertiary">
          <Shield size={20} className="mr-2 text-amber-400" />
          Audit log coming in Sprint 8.2 — filterable, searchable admin action history.
        </div>
      </ChartContainer>
    </div>
  );
}
