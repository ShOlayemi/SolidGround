import clsx from "clsx";

type SectionHeadingProps = {
  overline?: string;
  title: string;
  sub?: string;
  align?: "center" | "left";
  className?: string;
};

/**
 * SectionHeading — consistent overline + h2 (+ optional sub) for every
 * landing section. Enforces one-h2-per-section structure.
 */
export function SectionHeading({
  overline,
  title,
  sub,
  align = "center",
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={clsx(
        "mb-14 md:mb-16",
        align === "center" ? "text-center" : "text-left",
        className,
      )}
    >
      {overline && (
        <p className="mb-4 text-[12px] font-medium uppercase tracking-[0.14em] text-accent-600">
          {overline}
        </p>
      )}
      <h2 className="text-[32px] leading-[1.15] font-semibold tracking-[-0.03em] text-slate-900 text-balance md:text-[40px] md:leading-[1.15]">
        {title}
      </h2>
      {sub && (
        <p
          className={clsx(
            "mt-4 text-[17px] leading-[1.6] text-slate-600",
            align === "center" ? "mx-auto max-w-[640px]" : "max-w-[640px]",
          )}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
