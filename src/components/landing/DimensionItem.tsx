import clsx from "clsx";
import type { ReactNode } from "react";

type DimensionItemProps = {
  icon: ReactNode;
  label: string;
  description: string;
  className?: string;
};

/**
 * DimensionItem — one cell of the 12-dimension grid. Icon chip flips to
 * solid indigo on hover.
 */
export function DimensionItem({
  icon,
  label,
  description,
  className,
}: DimensionItemProps) {
  return (
    <div
      className={clsx(
        "group rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-accent-200 hover:shadow-[0_16px_40px_-16px_rgb(15_23_42_/_0.12)]",
        className,
      )}
    >
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent-50 text-accent-600 transition-colors duration-200 group-hover:bg-accent-600 group-hover:text-white">
        {icon}
      </div>
      <h3 className="text-[16px] font-semibold tracking-[-0.01em] text-slate-900">
        {label}
      </h3>
      <p className="mt-1.5 text-[14px] leading-[1.5] text-slate-500">
        {description}
      </p>
    </div>
  );
}
