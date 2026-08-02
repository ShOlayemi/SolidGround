import clsx from "clsx";
import type { ReactNode } from "react";

type FieldLabelProps = {
  children: ReactNode;
  htmlFor?: string;
  required?: boolean;
  className?: string;
};

export function FieldLabel({
  children,
  htmlFor,
  required,
  className,
}: FieldLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={clsx(
        "block text-[13px] font-medium text-solid-text-secondary mb-1.5",
        className,
      )}
    >
      {children}
      {required ? (
        <span className="text-solid-error ml-0.5" aria-hidden>
          *
        </span>
      ) : null}
    </label>
  );
}
