"use client";

// ──────────────────────────────────────────────────────────────
// SolidGround AI — Admin Feedback Table
// Filterable, paginated feedback list with inline status changes.
// ──────────────────────────────────────────────────────────────

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Inbox,
  Loader2,
} from "lucide-react";
import {
  updateFeedbackStatus,
  type Feedback,
  type FeedbackPage,
} from "@/lib/feedback/actions";
import {
  FEEDBACK_STATUSES,
  FEEDBACK_TYPES,
  type FeedbackStatus,
  type FeedbackType,
} from "@/lib/feedback/constants";
import { FeedbackStatusBadge } from "@/components/feedback/FeedbackStatusBadge";

const TYPE_LABELS: Record<FeedbackType, string> = {
  bug: "Bug report",
  feature: "Feature request",
  nps: "NPS",
  general: "General",
};

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  new: "New",
  reviewed: "Reviewed",
  planned: "Planned",
  in_progress: "In progress",
  completed: "Completed",
  declined: "Declined",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function authorLabel(item: Feedback): string {
  const email =
    typeof item.metadata?.user_email === "string"
      ? item.metadata.user_email
      : null;
  if (email) return email;
  return item.user_id ? `${item.user_id.slice(0, 8)}…` : "Anonymous";
}

interface FeedbackTableProps {
  initial?: FeedbackPage;
  error?: string;
  type: FeedbackType | "all";
  status: FeedbackStatus | "all";
}

export function FeedbackTable({ initial, error, type, status }: FeedbackTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const items = initial?.items ?? [];
  const total = initial?.total ?? 0;
  const page = initial?.page ?? 0;
  const pageSize = initial?.pageSize ?? 10;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function applyFilter(nextType: string, nextStatus: string) {
    const params = new URLSearchParams();
    if (nextType !== "all") params.set("type", nextType);
    if (nextStatus !== "all") params.set("status", nextStatus);
    params.set("page", "0");
    router.push(`/admin/reports?${params.toString()}`);
  }

  function goToPage(nextPage: number) {
    if (nextPage < 0 || nextPage >= totalPages) return;
    const params = new URLSearchParams();
    if (type !== "all") params.set("type", type);
    if (status !== "all") params.set("status", status);
    params.set("page", String(nextPage));
    router.push(`/admin/reports?${params.toString()}`);
  }

  function changeStatus(feedbackId: string, next: FeedbackStatus) {
    if (status !== "all" && next === status) return;
    startTransition(async () => {
      await updateFeedbackStatus(feedbackId, next);
      router.refresh();
    });
  }

  const selectClasses =
    "rounded-lg border border-card-border bg-card-bg px-3 py-2 text-[13px] text-text-primary focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20";

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={type}
          onChange={(event) => applyFilter(event.target.value, status)}
          className={selectClasses}
          aria-label="Filter by type"
        >
          <option value="all">All types</option>
          {FEEDBACK_TYPES.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(event) => applyFilter(type, event.target.value)}
          className={selectClasses}
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          {FEEDBACK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <span className="text-[13px] text-text-secondary">
          {total} {total === 1 ? "item" : "items"}
        </span>
        {isPending && (
          <Loader2 size={15} className="animate-spin text-amber-600" />
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-card-border bg-card-bg">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
              <Inbox size={22} className="text-amber-500" />
            </div>
            <h2 className="mt-4 text-[15px] font-semibold text-text-primary">
              No feedback found
            </h2>
            <p className="mt-1 max-w-[320px] text-[13px] text-text-secondary">
              {type !== "all" || status !== "all"
                ? "Try adjusting the filters to see more results."
                : "User feedback will appear here as it comes in."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-card-border bg-card-hover/50">
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                    Type
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                    Summary
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                    User
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                    Rating
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                    Status
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                    Date
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {items.map((item) => (
                  <tr key={item.id} className="align-top transition hover:bg-card-hover/40">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                        {TYPE_LABELS[item.type]}
                      </span>
                    </td>
                    <td className="max-w-[340px] px-4 py-3">
                      {item.title && (
                        <p className="text-[13px] font-medium text-text-primary">
                          {item.title}
                        </p>
                      )}
                      {item.description && (
                        <p className="mt-0.5 line-clamp-3 text-[13px] leading-relaxed text-text-secondary">
                          {item.description}
                        </p>
                      )}
                      {!item.title && !item.description && (
                        <p className="text-[13px] text-text-tertiary">—</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-text-secondary">
                      {authorLabel(item)}
                    </td>
                    <td className="px-4 py-3 text-[13px] tabular-nums text-text-primary">
                      {item.rating !== null ? (
                        <span className="font-medium">{item.rating}</span>
                      ) : (
                        <span className="text-text-tertiary">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <FeedbackStatusBadge status={item.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[13px] text-text-secondary">
                      {formatDate(item.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={item.status}
                        onChange={(event) =>
                          changeStatus(item.id, event.target.value as FeedbackStatus)
                        }
                        disabled={isPending}
                        aria-label="Change status"
                        className="rounded-md border border-card-border bg-card-bg px-2 py-1.5 text-[12px] text-text-primary focus:border-amber-500 focus:outline-none disabled:opacity-60"
                      >
                        {FEEDBACK_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-[13px] text-text-secondary">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 0}
              className="inline-flex items-center gap-1 rounded-lg border border-card-border bg-card-bg px-3 py-1.5 text-[13px] font-medium text-text-primary transition hover:bg-card-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft size={14} strokeWidth={1.8} />
              Previous
            </button>
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages - 1}
              className="inline-flex items-center gap-1 rounded-lg border border-card-border bg-card-bg px-3 py-1.5 text-[13px] font-medium text-text-primary transition hover:bg-card-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <ChevronRight size={14} strokeWidth={1.8} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
