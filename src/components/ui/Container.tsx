import clsx from "clsx";
import type { ReactNode } from "react";

type ContainerProps = {
  narrow?: boolean;
  children: ReactNode;
  className?: string;
};

export function Container({ narrow, children, className }: ContainerProps) {
  return (
    <div
      className={clsx(
        "mx-auto px-5 md:px-8",
        narrow ? "max-w-[720px]" : "max-w-[1120px]",
        className,
      )}
    >
      {children}
    </div>
  );
}
