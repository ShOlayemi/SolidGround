/**
 * HeroBackground — decorative gradient layers + blurred ambient blobs.
 * Server-safe (divs only, no client JS). aria-hidden; motion disabled
 * globally under `prefers-reduced-motion: reduce` via globals.css.
 */
export function HeroBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {/* Base gradient: slate-50 → white */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-white" />

      {/* Indigo blob — top-left */}
      <div className="absolute -left-24 -top-24 h-[320px] w-[320px] -translate-x-1/3 -translate-y-1/3 sm:-left-40 sm:-top-40 sm:h-[560px] sm:w-[560px]">
        <div className="h-full w-full rounded-full bg-indigo-200/30 blur-3xl animate-drift" />
      </div>

      {/* Violet blob — right */}
      <div className="absolute -right-24 top-16 h-[320px] w-[320px] sm:-right-44 sm:top-24 sm:h-[560px] sm:w-[560px]">
        <div
          className="h-full w-full rounded-full bg-violet-200/25 blur-3xl animate-drift"
          style={{ animationDelay: "-12s" }}
        />
      </div>
    </div>
  );
}
