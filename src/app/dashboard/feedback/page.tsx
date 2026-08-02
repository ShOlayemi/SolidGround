import { redirect } from "next/navigation";
import { MessageSquare, Inbox } from "lucide-react";
import { getSession } from "@/lib/auth/actions";
import { getMyFeedback, type FeedbackType } from "@/lib/feedback/actions";
import { FeedbackStatusBadge } from "@/components/feedback/FeedbackStatusBadge";
import { OpenFeedbackButton } from "./OpenFeedbackButton";

const TYPE_LABELS: Record<FeedbackType, string> = {
  bug: "Bug report",
  feature: "Feature request",
  nps: "NPS response",
  general: "General feedback",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Feedback",
  description: "Send feedback to the SolidGround AI team.",
};
export default async function FeedbackPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const result = await getMyFeedback(session.user.id);
  const items = result.success ? result.feedback : [];

  return (
    <div className="max-w-[800px]">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
            Feedback
          </h1>
          <p className="mt-2 text-text-secondary">
            See the feedback you&apos;ve shared and track its status.
          </p>
        </div>
        <OpenFeedbackButton />
      </header>

      <div className="overflow-hidden rounded-xl border border-card-border bg-card-bg">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-50">
              <Inbox size={22} className="text-accent-500" />
            </div>
            <h2 className="mt-4 text-[15px] font-semibold text-text-primary">
              No feedback yet
            </h2>
            <p className="mt-1 max-w-[320px] text-[13px] text-text-secondary">
              Found a bug, have an idea, or want to tell us how we&apos;re doing?
              We&apos;d love to hear from you.
            </p>
            <div className="mt-5">
              <OpenFeedbackButton />
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-card-border">
            {items.map((item) => (
              <li key={item.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-text-primary">
                    <MessageSquare size={13} strokeWidth={1.8} className="text-accent-500" />
                    {TYPE_LABELS[item.type]}
                  </span>
                  <FeedbackStatusBadge status={item.status} />
                  <time className="ml-auto text-xs text-text-tertiary">
                    {formatDate(item.created_at)}
                  </time>
                </div>
                {item.title && (
                  <h3 className="mt-1.5 text-[14px] font-medium text-text-primary">
                    {item.title}
                  </h3>
                )}
                {item.description && (
                  <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
                    {item.description}
                  </p>
                )}
                {item.rating !== null && item.type === "nps" && (
                  <p className="mt-1.5 text-[13px] font-medium text-text-primary">
                    Score: {item.rating}/10
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
