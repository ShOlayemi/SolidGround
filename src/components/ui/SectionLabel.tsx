import clsx from "clsx";
import type { ReactNode } from "react";

type SectionLabelProps = {
  children: ReactNode;
  className?: string;
};

export function SectionLabel({ children, className }: SectionLabelProps) {
  return (
    <p
      className={clsx(
        "text-xs font-medium uppercase tracking-[0.14em] text-accent-600",
        className,
      )}
    >
      {children}
    </p>
  );
}
