import type { TopicStatus } from "@/lib/journey/types";
import clsx from "clsx";

/**
 * Journey — topic status pill ("Discussed" / "Not started").
 *
 * Pure presentational component (no hooks) so it renders fine from both
 * server components (dashboard list) and client components (topic detail).
 */
export function TopicStatusPill({ status }: { status: TopicStatus }) {
  const discussed = status === "discussed";
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-5",
        discussed
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
          : "bg-slate-100 text-text-secondary ring-1 ring-inset ring-slate-200",
      )}
    >
      {discussed ? "Discussed" : "Not started"}
    </span>
  );
}
