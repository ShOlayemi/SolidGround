"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resetSession } from "@/lib/assessment/actions";
import { Button } from "@/components/ui/Button";
import type { RelationshipType } from "@/types";

interface ResetSessionButtonProps {
  /** Visual style of the button */
  variant?: "link" | "ghost";
  /** Custom button label */
  label?: string;
  /** Optional description shown below the button */
  description?: string;
  /** Optional CSS classes */
  className?: string;
  /** Relationship mode for the new session */
  mode?: RelationshipType;
}

export function ResetSessionButton({
  variant = "link",
  label = "Start Over",
  description,
  className,
  mode,
}: ResetSessionButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleReset = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await resetSession(mode ?? "romantic");
        if (result.success && result.session) {
          router.push(`/dashboard/blueprint/assess?mode=${mode ?? "romantic"}`);
        } else {
          setError(result.error ?? "Failed to reset. Please try again.");
        }
      } catch {
        setError("Something went wrong. Please try again.");
      }
    });
  };

  if (variant === "link") {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={handleReset}
          disabled={isPending}
          className="text-[13px] text-solid-text-tertiary hover:text-solid-text-secondary hover:underline transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Starting fresh…" : label}
        </button>
        {description && (
          <p className="text-[12px] text-solid-text-tertiary mt-1">
            {description}
          </p>
        )}
        {error && (
          <p className="text-[12px] text-red-600 mt-1">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleReset}
        disabled={isPending}
      >
        {isPending ? "Starting fresh…" : label}
      </Button>
      {description && (
        <p className="text-[12px] text-solid-text-tertiary mt-1 text-center">
          {description}
        </p>
      )}
      {error && (
        <p className="text-[12px] text-red-600 mt-1 text-center">{error}</p>
      )}
    </div>
  );
}
