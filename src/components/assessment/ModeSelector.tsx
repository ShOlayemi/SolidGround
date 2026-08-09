"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import type { RelationshipType } from "@/types";

interface ModeSelectorProps {
  /** Start fresh (reset existing session) vs continue with existing flow */
  resetFirst?: boolean;
  /** Custom button label */
  label?: string;
  /** Button variant */
  variant?: "filled" | "outline" | "ghost";
  /** Button size */
  size?: "sm" | "md" | "lg";
}

export function ModeSelector({
  resetFirst = false,
  label = "Start Assessment",
  variant = "filled",
  size = "lg",
}: ModeSelectorProps) {
  const router = useRouter();
  const [mode, setMode] = useState<RelationshipType>("romantic");
  const [isPending, setIsPending] = useState(false);

  const handleStart = async () => {
    setIsPending(true);
    try {
      if (resetFirst) {
        // Import dynamically to avoid server-action bundling issues
        const { resetSession } = await import("@/lib/assessment/actions");
        await resetSession(mode);
      }
      router.push(`/dashboard/blueprint/assess?mode=${mode}`);
    } catch {
      // Navigate anyway — session will be created lazily on the assess page
      router.push(`/dashboard/blueprint/assess?mode=${mode}`);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <fieldset className="flex flex-col items-center gap-1">
        <legend className="text-[13px] font-medium text-solid-text-secondary mb-2">
          I&apos;m looking to assess for:
        </legend>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="blueprintMode"
              value="romantic"
              checked={mode === "romantic"}
              onChange={() => setMode("romantic")}
              className="accent-accent-600"
            />
            <span className="text-[14px] text-solid-text">Romantic relationship</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="blueprintMode"
              value="platonic"
              checked={mode === "platonic"}
              onChange={() => setMode("platonic")}
              className="accent-accent-600"
            />
            <span className="text-[14px] text-solid-text">Friendship</span>
          </label>
        </div>
      </fieldset>
      <Button
        variant={variant}
        size={size}
        onClick={handleStart}
        disabled={isPending}
        className="text-[15px] px-10 py-4"
      >
        {isPending ? "Starting…" : label}
      </Button>
    </div>
  );
}
