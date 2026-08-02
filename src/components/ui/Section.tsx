import clsx from "clsx";
import type { ReactNode } from "react";

type SectionProps = {
  tinted?: boolean;
  id?: string;
  children: ReactNode;
  className?: string;
};

export function Section({ tinted, id, children, className }: SectionProps) {
  return (
    <section
      id={id}
      className={clsx(
        "py-28 md:py-32",
        tinted && "bg-slate-50",
        className,
      )}
    >
      {children}
    </section>
  );
}
