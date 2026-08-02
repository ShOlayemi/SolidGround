"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { makeAdmin } from "@/lib/admin/actions";

export function SetupForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await makeAdmin();

    if (result.success) {
      router.push("/admin");
    } else {
      setError(result.error ?? "Failed to claim admin role");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6">
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <p className="mb-4 text-xs text-text-tertiary">
        This will set your account as the first administrator. You will be able to
        manage users, view platform analytics, and promote additional admins.
      </p>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Setting up..." : "Claim Admin Role"}
      </button>
    </form>
  );
}
