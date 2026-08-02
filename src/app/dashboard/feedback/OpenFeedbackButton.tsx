"use client";

import { Plus } from "lucide-react";
import { openFeedbackWidget } from "@/lib/feedback/open";

export function OpenFeedbackButton() {
  return (
    <button
      type="button"
      onClick={openFeedbackWidget}
      className="inline-flex items-center gap-2 rounded-lg bg-accent-600 px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-500/40"
    >
      <Plus size={16} strokeWidth={1.8} />
      Submit feedback
    </button>
  );
}
