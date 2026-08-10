"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function UsersPagination({
  currentPage,
  totalPages,
}: {
  currentPage: number;
  totalPages: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const goToPage = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (page <= 1) {
        params.delete("page");
      } else {
        params.set("page", String(page));
      }
      startTransition(() => {
        router.push(`/admin/users?${params.toString()}`);
      });
    },
    [searchParams, router],
  );

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-4 pt-4">
      <p className="text-sm text-text-secondary">
        Page {currentPage} of {totalPages}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1 || isPending}
          className="rounded-lg border border-card-border p-2 text-text-secondary transition hover:border-amber-300 hover:text-amber-700 disabled:opacity-30"
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>
        {generatePageNumbers(currentPage, totalPages).map((page, i) =>
          page === null ? (
            <span key={`ellipsis-${i}`} className="px-1 text-text-tertiary">
              …
            </span>
          ) : (
            <button
              key={page}
              onClick={() => goToPage(page)}
              disabled={isPending}
              className={`min-w-[36px] rounded-lg border px-2 py-1.5 text-sm font-medium transition ${
                page === currentPage
                  ? "border-amber-400 bg-amber-50 text-amber-800"
                  : "border-card-border text-text-secondary hover:border-amber-300 hover:text-amber-700"
              } disabled:opacity-50`}
            >
              {page}
            </button>
          ),
        )}
        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages || isPending}
          className="rounded-lg border border-card-border p-2 text-text-secondary transition hover:border-amber-300 hover:text-amber-700 disabled:opacity-30"
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function generatePageNumbers(
  current: number,
  total: number,
): (number | null)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | null)[] = [1];
  if (current > 3) pages.push(null);
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push(null);
  pages.push(total);
  return pages;
}
