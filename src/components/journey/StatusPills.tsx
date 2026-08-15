import clsx from "clsx";
import type { AgreementStatus, GoalStatus } from "@/lib/journey/types";
import { AGREEMENT_STATUS_LABEL, GOAL_STATUS_LABEL } from "@/lib/journey/display";

/**
 * SolidGround AI — Journey status pills (goals + agreements).
 *
 * Pure presentational components (no hooks) so they render fine from both
 * server components and client components. Mirrors TopicStatusPill's visual
 * language: small rounded pill, tinted ring, 11px semibold label.
 */
export function GoalStatusPill({ status }: { status: GoalStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-5",
        status === "completed" && "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
        status === "in_progress" && "bg-warning-50 text-warning-700 ring-1 ring-inset ring-warning-200",
        status === "not_started" && "bg-slate-100 text-text-secondary ring-1 ring-inset ring-slate-200",
      )}
    >
      {GOAL_STATUS_LABEL[status]}
    </span>
  );
}

export function AgreementStatusPill({ status }: { status: AgreementStatus }) {
  const agreed = status === "agreed";
  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-5",
        agreed
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
          : "bg-slate-100 text-text-secondary ring-1 ring-inset ring-slate-200",
      )}
    >
      {AGREEMENT_STATUS_LABEL[status]}
    </span>
  );
}
