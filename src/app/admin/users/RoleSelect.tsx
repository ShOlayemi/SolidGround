"use client";

import { useState, useTransition } from "react";
import { setUserRole } from "@/lib/admin/actions";
import type { UserRole } from "@/types";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "user", label: "User" },
  { value: "support", label: "Support" },
  { value: "moderator", label: "Moderator" },
  { value: "admin", label: "Admin" },
];

const roleBadgeClass: Record<UserRole, string> = {
  user: "bg-slate-100 text-slate-700",
  admin: "bg-amber-100 text-amber-800",
  moderator: "bg-indigo-100 text-indigo-700",
  support: "bg-emerald-100 text-emerald-700",
};

export function RoleSelect({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: UserRole;
}) {
  const [isPending, startTransition] = useTransition();
  const [role, setRole] = useState<UserRole>(currentRole);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );

  const handleChange = (newRole: UserRole) => {
    if (newRole === role) return;
    setRole(newRole);
    setStatus("saving");
    startTransition(async () => {
      const result = await setUserRole(userId, newRole);
      if (result.success) {
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 2000);
      } else {
        setStatus("error");
        setRole(currentRole);
        setTimeout(() => setStatus("idle"), 3000);
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={role}
        onChange={(e) => handleChange(e.target.value as UserRole)}
        disabled={isPending}
        className={`rounded-md border px-2 py-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-400 disabled:opacity-50 ${
          roleBadgeClass[role]
        }`}
        aria-label={`Role for user ${userId}`}
      >
        {ROLE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {status === "saving" && (
        <span className="text-xs text-text-tertiary">Saving…</span>
      )}
      {status === "saved" && (
        <span className="text-xs text-emerald-600">Saved</span>
      )}
      {status === "error" && (
        <span className="text-xs text-red-500">Failed</span>
      )}
    </div>
  );
}
