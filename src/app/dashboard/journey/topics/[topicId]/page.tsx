// ──────────────────────────────────────────────────────────────
// SolidGround AI — Journey Topic Detail (/dashboard/journey/topics/[topicId])
// ──────────────────────────────────────────────────────────────
// Server component: loads one persisted journey topic via getTopic() and
// hands it to the client surface (which owns the optimistic status toggle).
// getTopic() returns null when the row is missing OR RLS hides it (the
// caller is not a pairing participant) — both render the not-found state.
// Auth is handled by the dashboard layout.
// ──────────────────────────────────────────────────────────────

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getTopic } from "@/lib/journey/actions";
import { TopicDetailClient } from "@/components/journey/TopicDetailClient";

export const metadata: Metadata = {
  title: "Journey Topic",
  description: "A conversation topic from your Alignment Match™.",
};

interface JourneyTopicPageProps {
  params: Promise<{ topicId: string }>;
}

export default async function JourneyTopicPage({ params }: JourneyTopicPageProps) {
  const { topicId } = await params;
  const result = await getTopic(topicId);

  if (!result.ok || !result.data) {
    return (
      <div className="mx-auto max-w-[640px] py-20 text-center">
        <h1 className="text-2xl font-semibold text-text-primary">Topic not found</h1>
        <p className="mt-3 text-sm text-text-secondary">
          {!result.ok
            ? (result.error ?? "This topic couldn\u2019t be loaded. Please try again.")
            : "This topic isn\u2019t available in your Journey — it may have been removed or belong to a pairing you\u2019re not part of."}
        </p>
        <Link
          href="/dashboard/journey"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
        >
          <ArrowLeft size={16} />
          Back to Journey
        </Link>
      </div>
    );
  }

  return <TopicDetailClient key={result.data.id} topic={result.data} />;
}
