import clsx from "clsx";
import type { ReactNode } from "react";

type FeatureCardProps = {
  icon: ReactNode;
  title: string;
  description: string;
  number?: number;
  className?: string;
};

/**
 * FeatureCard — premium card with icon chip that flips to solid indigo
 * on hover, and a subtle lift + shadow. Evolved from IconCard.
 */
export function FeatureCard({
  icon,
  title,
  description,
  number,
  className,
}: FeatureCardProps) {
  return (
    <div
      className={clsx(
        "group relative flex flex-col rounded-2xl border border-slate-200 bg-white p-8 transition-all duration-300 hover:-translate-y-1 hover:border-accent-200 hover:shadow-[0_16px_40px_-16px_rgb(15_23_42_/_0.12)]",
        className,
      )}
    >
      {number !== undefined && (
        <p className="mb-4 text-[13px] font-medium tabular-nums text-slate-400">
          {String(number).padStart(2, "0")}
        </p>
      )}
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-50 text-accent-600 transition-colors duration-200 group-hover:bg-accent-600 group-hover:text-white">
        {icon}
      </div>
      <h3 className="text-[18px] leading-[1.4] font-semibold tracking-[-0.01em] text-slate-900">
        {title}
      </h3>
      <p className="mt-2 text-[15px] leading-[1.5] text-slate-500">
        {description}
      </p>
    </div>
  );
}
