"use client";

import type { AssessmentCategory } from "@/types";
import { CATEGORY_ORDER, CATEGORY_LABELS } from "@/lib/assessment/questions";
import clsx from "clsx";

interface CategoryProgressData {
  category: AssessmentCategory;
  label: string;
  answered: number;
  total: number;
  complete: boolean;
}

interface CategorySidebarProps {
  categories: CategoryProgressData[];
  currentCategory: AssessmentCategory;
  answeredQuestionIds: Set<string>;
  onSelectCategory: (category: AssessmentCategory) => void;
}

export function CategorySidebar({
  categories,
  currentCategory,
  answeredQuestionIds,
  onSelectCategory,
}: CategorySidebarProps) {
  return (
    <>
      {/* Desktop: vertical sidebar */}
      <nav
        className="hidden md:flex flex-col gap-0.5 w-[200px] shrink-0 border-r border-solid-border pr-4"
        aria-label="Assessment categories"
      >
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-solid-text-tertiary px-2 mb-2 mt-1">
          Categories
        </h3>
        {categories.map((cat) => {
          const isActive = cat.category === currentCategory;
          const isPending = !cat.complete && cat.answered > 0;

          return (
            <button
              key={cat.category}
              type="button"
              onClick={() => onSelectCategory(cat.category)}
              className={clsx(
                "flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors duration-200 w-full",
                isActive
                  ? "bg-solid-accent-subtle text-solid-text"
                  : "text-solid-text-secondary hover:bg-solid-accent-subtle/50 hover:text-solid-text",
              )}
            >
              {/* Status dot */}
              <span
                className={clsx(
                  "w-2 h-2 rounded-full shrink-0 border",
                  cat.complete
                    ? "bg-solid-accent border-solid-accent"
                    : isPending
                      ? "bg-solid-accent-subtle border-solid-accent"
                      : "bg-transparent border-solid-border",
                )}
              />

              {/* Label + count */}
              <span className="flex-1 text-[13px] font-medium leading-tight truncate">
                {cat.label}
              </span>
              <span className="text-[11px] text-solid-text-tertiary shrink-0 tabular-nums">
                {cat.answered}/{cat.total}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Mobile: horizontal scrollable strip */}
      <nav
        className="-mx-4 flex max-w-[calc(100vw-2rem)] gap-1.5 overflow-x-auto px-4 pb-2 scrollbar-hide md:hidden"
        aria-label="Assessment categories"
      >
        {categories.map((cat) => {
          const isActive = cat.category === currentCategory;
          const isPending = !cat.complete && cat.answered > 0;

          return (
            <button
              key={cat.category}
              type="button"
              onClick={() => onSelectCategory(cat.category)}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap shrink-0 transition-colors duration-200 border min-h-[44px]",
                isActive
                  ? "bg-solid-accent-subtle border-solid-accent text-solid-text"
                  : "border-solid-border text-solid-text-secondary hover:border-solid-accent/40",
              )}
            >
              <span
                className={clsx(
                  "w-1.5 h-1.5 rounded-full shrink-0",
                  cat.complete
                    ? "bg-solid-accent"
                    : isPending
                      ? "bg-solid-accent/60"
                      : "bg-solid-border",
                )}
              />
              <span>{cat.label}</span>
              <span className="text-[11px] text-solid-text-tertiary tabular-nums">
                {cat.answered}/{cat.total}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
