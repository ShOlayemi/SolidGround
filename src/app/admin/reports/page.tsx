import {
  getAllFeedback,
  type FeedbackStatus,
  type FeedbackType,
} from "@/lib/feedback/actions";
import { FeedbackTable } from "./FeedbackTable";

const PAGE_SIZE = 10;

interface AdminReportsPageProps {
  searchParams: Promise<{ type?: string; status?: string; page?: string }>;
}

import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Reports & Feedback",
  description: "User feedback and reported content.",
};
export default async function AdminReportsPage({
  searchParams,
}: AdminReportsPageProps) {
  const params = await searchParams;

  const type = (params.type ?? "all") as FeedbackType | "all";
  const status = (params.status ?? "all") as FeedbackStatus | "all";
  const page = Math.max(0, parseInt(params.page ?? "0", 10) || 0);

  const result = await getAllFeedback(page, PAGE_SIZE, type, status);

  return (
    <div className="max-w-[1280px]">
      <header className="mb-8">
        <p className="text-sm font-medium text-amber-600">Admin Panel</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text-primary">
          Reports &amp; Feedback
        </h1>
        <p className="mt-2 text-text-secondary">
          Bug reports, feature requests, and NPS responses from users.
        </p>
      </header>

      <FeedbackTable
        initial={result.success ? result.page : undefined}
        error={result.success ? undefined : result.error}
        type={type}
        status={status}
      />
    </div>
  );
}
