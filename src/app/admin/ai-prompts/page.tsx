import { Sparkles } from "lucide-react";
import { ChartContainer } from "@/components/dashboard/ChartContainer";

import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "AI Prompts",
  description: "Manage AI prompt configuration.",
};
export default async function AdminAIPromptsPage() {
  return (
    <div className="max-w-[1280px]">
      <header className="mb-8">
        <p className="text-sm font-medium text-amber-600">Admin Panel</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text-primary">AI Prompts</h1>
        <p className="mt-2 text-text-secondary">Manage AI prompt templates and response configurations.</p>
      </header>
      <ChartContainer title="Prompt Management" description="Edit AI insight prompt templates">
        <div className="mt-4 flex items-center justify-center py-12 text-sm text-text-tertiary">
          <Sparkles size={20} className="mr-2 text-amber-400" />
          AI prompt management coming in a future sprint.
        </div>
      </ChartContainer>
    </div>
  );
}
