import clsx from "clsx";

type AvatarProps = {
  src?: string | null;
  alt?: string;
  size?: "sm" | "md" | "lg" | "xl";
  initials?: string;
  className?: string;
};

const sizeClasses = {
  sm: "w-8 h-8 text-[11px]",
  md: "w-10 h-10 text-[13px]",
  lg: "w-16 h-16 text-[20px]",
  xl: "w-24 h-24 text-[32px]",
} as const;
// Explicit intrinsic dimensions per size — prevents layout shift while the
// remote avatar loads (also feeds the `sizes` hint for srcset selection).
const sizePx = { sm: 32, md: 40, lg: 64, xl: 96 } as const;

export function Avatar({
  src,
  alt = "",
  size = "lg",
  initials,
  className,
}: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        width={sizePx[size]}
        height={sizePx[size]}
        loading="lazy"
        sizes={sizePx[size] >= 64 ? `${sizePx[size]}px` : "40px"}
        className={clsx(
          "rounded-full object-cover border border-solid-border",
          sizeClasses[size],
          className,
        )}
      />
    );
  }

  return (
    <div
      className={clsx(
        "rounded-full bg-solid-accent-subtle border border-solid-border flex items-center justify-center text-solid-text-secondary font-medium",
        sizeClasses[size],
        className,
      )}
      aria-hidden
    >
      {initials ? (
        <span className="tracking-tight">{initials}</span>
      ) : (
        <svg
          className={clsx(
            size === "xl" ? "w-10 h-10" : size === "lg" ? "w-7 h-7" : "w-5 h-5",
            "text-solid-text-tertiary",
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
          />
        </svg>
      )}
    </div>
  );
}
