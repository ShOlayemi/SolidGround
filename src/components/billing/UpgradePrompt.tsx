"use client";
import { Crown } from "lucide-react";

export function UpgradePrompt({ feature, message }: { feature: string; message?: string }) {
  return (
    <div className="rounded-xl border border-accent-200 bg-accent-50 p-6 text-center">
      <Crown className="mx-auto mb-3 h-8 w-8 text-accent-600" />
      <h3 className="text-lg font-semibold text-text-primary">Premium Feature</h3>
      <p className="mt-2 text-sm text-text-secondary">
        {message || `${feature} will be available on the Premium plan.`}
      </p>
      <p className="mt-3 inline-block rounded-lg border border-dashed border-card-border px-5 py-2.5 text-sm text-text-tertiary">
        Coming soon
      </p>
    </div>
  );
}
