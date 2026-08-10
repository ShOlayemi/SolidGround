"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition, useState, useEffect } from "react";
import { Search, X } from "lucide-react";

export function UserSearch({ defaultValue = "" }: { defaultValue?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(defaultValue);

  // Keep local state in sync with URL
  useEffect(() => {
    setValue(searchParams.get("search") ?? "");
  }, [searchParams]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) {
        params.set("search", value.trim());
      } else {
        params.delete("search");
      }
      params.delete("page"); // reset to page 1 on new search
      startTransition(() => {
        router.push(`/admin/users?${params.toString()}`);
      });
    },
    [value, searchParams, router],
  );

  const handleClear = useCallback(() => {
    setValue("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("search");
    params.delete("page");
    startTransition(() => {
      router.push(`/admin/users?${params.toString()}`);
    });
  }, [searchParams, router]);

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search by name..."
          aria-label="Search users by name"
          className="w-full rounded-lg border border-card-border bg-card-bg py-2 pl-9 pr-8 text-sm text-text-primary placeholder:text-text-tertiary focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-text-tertiary hover:text-text-secondary"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700 disabled:opacity-50"
      >
        {isPending ? "Searching..." : "Search"}
      </button>
    </form>
  );
}
