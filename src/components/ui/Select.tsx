import clsx from "clsx";
import type { ComponentPropsWithoutRef } from "react";

type SelectProps = Omit<ComponentPropsWithoutRef<"select">, "type"> & {
  error?: string;
  placeholder?: string;
};

export function Select({
  error,
  disabled,
  className,
  placeholder,
  children,
  ...props
}: SelectProps) {
  return (
    <select
      disabled={disabled}
      className={clsx(
        "bg-solid-surface border rounded-lg px-5 py-3.5 text-[17px] leading-[1.6] text-solid-text transition-colors duration-150 outline-none appearance-none cursor-pointer",
        "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%228%22%20viewBox%3D%220%200%2012%208%22%3E%3Cpath%20fill%3D%22%236B6B6B%22%20d%3D%22M1.41.59L6%205.17%2010.59.59%2012%202l-6%206-6-6z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px_8px] bg-[right_16px_center] bg-no-repeat pr-12",
        error
          ? "border-solid-error ring-2 ring-solid-error/20"
          : "border-solid-border focus:border-solid-accent focus:ring-2 focus:ring-solid-accent/20",
        disabled && "opacity-50 cursor-not-allowed",
        !props.value || props.value === ""
          ? "text-solid-text-tertiary"
          : "text-solid-text",
        className,
      )}
      {...props}
    >
      {placeholder ? (
        <option value="" disabled>
          {placeholder}
        </option>
      ) : null}
      {children}
    </select>
  );
}
