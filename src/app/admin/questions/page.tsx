import { MessageSquare } from "lucide-react";
import { ChartContainer } from "@/components/dashboard/ChartContainer";

import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Question Management",
  description: "Manage assessment questions.",
};
export default async function AdminQuestionsPage() {
  return (
    <div className="max-w-[1280px]">
      <header className="mb-8">
        <p className="text-sm font-medium text-amber-600">Admin Panel</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text-primary">Questions</h1>
        <p className="mt-2 text-text-secondary">Manage assessment questions and categories.</p>
      </header>
      <ChartContainer title="Question Management" description="Edit assessment questions and category assignments">
        <div className="mt-4 flex items-center justify-center py-12 text-sm text-text-tertiary">
          <MessageSquare size={20} className="mr-2 text-amber-400" />
          Question management coming in a future sprint.
        </div>
      </ChartContainer>
    </div>
  );
}
