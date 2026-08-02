import clsx from "clsx";
import type { ComponentPropsWithoutRef } from "react";

type InputProps = Omit<ComponentPropsWithoutRef<"input">, "type"> & {
  type?: "email" | "text" | "password" | "date";
  error?: string;
  variant?: "light" | "dark";
};

export function Input({
  type = "text",
  error,
  disabled,
  variant = "light",
  className,
  ...props
}: InputProps) {
  return (
    <input
      type={type}
      disabled={disabled}
      className={clsx(
        "border rounded-lg px-5 py-3.5 text-[17px] leading-[1.6] transition-colors duration-150 outline-none",
        variant === "light"
          ? "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
          : "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500",
        error
          ? "border-danger-500 ring-2 ring-danger-500/20"
          : variant === "light"
            ? "focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20"
            : "focus:border-accent-400 focus:ring-2 focus:ring-accent-400/20",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
      {...props}
    />
  );
}
