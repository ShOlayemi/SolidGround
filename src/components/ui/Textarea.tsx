import clsx from "clsx";
import type { ComponentPropsWithoutRef } from "react";

type TextareaProps = Omit<ComponentPropsWithoutRef<"textarea">, "type"> & {
  error?: string;
};

export function Textarea({
  error,
  disabled,
  className,
  ...props
}: TextareaProps) {
  return (
    <textarea
      disabled={disabled}
      className={clsx(
        "bg-solid-surface border rounded-lg px-5 py-3.5 text-[17px] leading-[1.6] text-solid-text placeholder:text-solid-text-tertiary transition-colors duration-150 outline-none resize-vertical min-h-[120px]",
        error
          ? "border-solid-error ring-2 ring-solid-error/20"
          : "border-solid-border focus:border-solid-accent focus:ring-2 focus:ring-solid-accent/20",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
      {...props}
    />
  );
}
