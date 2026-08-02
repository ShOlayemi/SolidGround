import clsx from "clsx";
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

type ButtonBaseProps = {
  variant?: "filled" | "outline" | "ghost" | "inverse" | "outlineDark";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  className?: string;
};

type ButtonAsButton = ButtonBaseProps &
  Omit<ComponentPropsWithoutRef<"button">, keyof ButtonBaseProps> & {
    href?: undefined;
  };

type ButtonAsLink = ButtonBaseProps &
  Omit<ComponentPropsWithoutRef<"a">, keyof ButtonBaseProps> & {
    href: string;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

const sizeClasses = {
  sm: "px-4 py-2 text-[14px] leading-[1.4]",
  md: "px-6 py-3.5 text-[14px] leading-[1.4]",
  lg: "px-8 py-4 text-[14px] leading-[1.4]",
} as const;

const variantClasses = {
  filled:
    "bg-accent-600 text-white hover:bg-accent-500 focus-visible:ring-accent-500/30",
  outline:
    "bg-transparent border border-accent-600 text-accent-600 hover:bg-accent-50 focus-visible:ring-accent-500/30",
  ghost:
    "bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus-visible:ring-accent-500/30",
  inverse:
    "bg-white text-slate-900 hover:bg-slate-100 focus-visible:ring-white/40",
  outlineDark:
    "bg-transparent border border-slate-600 text-slate-100 hover:bg-slate-800 hover:border-slate-500 focus-visible:ring-white/20",
} as const;

export function Button({
  variant = "filled",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  const classes = clsx(
    "inline-flex items-center justify-center rounded-lg font-medium transition-colors duration-150 gap-2 focus:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]",
    sizeClasses[size],
    variantClasses[variant],
    className,
  );

  if (props.href !== undefined) {
    const { href, ...rest } = props;
    return <a href={href} className={classes} {...rest} />;
  }

  return <button className={classes} {...(props as ButtonAsButton)} />;
}
