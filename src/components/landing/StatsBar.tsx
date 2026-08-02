import clsx from "clsx";

type Stat = {
  value: string;
  label: string;
};

type StatsBarProps = {
  stats: Stat[];
  className?: string;
};

/**
 * StatsBar — real product facts only (12 dimensions, 88 questions,
 * ~15 minutes, 2 profiles). No fabricated metrics.
 */
export function StatsBar({ stats, className }: StatsBarProps) {
  return (
    <div
      className={clsx(
        "grid grid-cols-2 gap-x-2 gap-y-8 sm:gap-x-4 lg:grid-cols-4 lg:gap-y-0",
        className,
      )}
    >
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          className={clsx(
            "px-4 text-center",
            i > 0 && "lg:border-l lg:border-slate-200",
          )}
        >
          <p className="text-[36px] font-semibold leading-[1.1] tracking-[-0.02em] tabular-nums text-slate-900">
            {stat.value}
          </p>
          <p className="mt-2 text-[14px] leading-[1.4] text-slate-500">
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  );
}
