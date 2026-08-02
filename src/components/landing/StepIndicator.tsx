import type { ReactNode } from "react";

export type Step = {
  title: string;
  description: string;
  icon: ReactNode;
};

type StepIndicatorProps = {
  steps: Step[];
};

/**
 * StepIndicator — 3-step process visual.
 * Desktop: 3 centered columns joined by a connector line behind the nodes.
 * Mobile: vertical stack with a left rail.
 * Ordered-list semantics; node numbers are aria-hidden (labels are visible).
 */
export function StepIndicator({ steps }: StepIndicatorProps) {
  return (
    <ol className="relative space-y-12 lg:grid lg:grid-cols-3 lg:gap-10 lg:space-y-0">
      {/* Connector line behind the nodes (desktop only) */}
      <div
        aria-hidden
        className="absolute left-[16.6%] right-[16.6%] top-6 hidden h-px bg-gradient-to-r from-slate-200 via-accent-200 to-slate-200 lg:block"
      />

      {steps.map((step, i) => (
        <li
          key={step.title}
          className="relative flex gap-5 lg:block lg:text-center"
        >
          {/* Mobile vertical rail (hidden on last step) */}
          {i < steps.length - 1 && (
            <div
              aria-hidden
              className="absolute bottom-[-3rem] left-6 top-14 w-px bg-slate-200 lg:hidden"
            />
          )}

          <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-600 text-[15px] font-semibold text-white shadow-[0_8px_20px_-8px_rgb(79_70_229_/_0.5)]">
            <span aria-hidden>{String(i + 1).padStart(2, "0")}</span>
            <span className="sr-only">Step {i + 1}</span>
          </div>

          <div className="lg:mt-6">
            <h3 className="flex items-center gap-2 text-[18px] font-semibold tracking-[-0.01em] text-slate-900 lg:justify-center">
              <span className="text-accent-600" aria-hidden>
                {step.icon}
              </span>
              {step.title}
            </h3>
            <p className="mt-2 text-[15px] leading-[1.6] text-slate-600 lg:mx-auto lg:max-w-[280px]">
              {step.description}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
