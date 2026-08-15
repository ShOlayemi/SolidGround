// ──────────────────────────────────────────────────────────────
// SolidGround AI — Coach Conversation Page (/dashboard/coach/[id])
// ──────────────────────────────────────────────────────────────
// Server component: loads the conversation + transcript (oldest-first)
// via the coach server action and hands it to the client thread view.
// A `key` on the client view forces a fresh mount when navigating
// between conversations, so local message state never leaks across
// threads. Auth is handled by the dashboard layout; the coach is free.
// ──────────────────────────────────────────────────────────────

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getConversation } from "@/lib/coach/actions";
import { ConversationView } from "@/components/coach/ConversationView";

export const metadata: Metadata = {
  title: "AI Coach",
  description: "A private conversation with your AI relationship coach.",
};

interface CoachConversationPageProps {
  params: Promise<{ conversationId: string }>;
}

export default async function CoachConversationPage({ params }: CoachConversationPageProps) {
  const { conversationId } = await params;
  const result = await getConversation(conversationId);

  if (!result.ok || !result.conversation) {
    return (
      <div className="mx-auto max-w-[640px] py-20 text-center">
        <h1 className="text-2xl font-semibold text-text-primary">Conversation not found</h1>
        <p className="mt-3 text-sm text-text-secondary">
          {result.error ?? "This conversation isn\u2019t available. Please go back and try again."}
        </p>
        <Link
          href="/dashboard/coach"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
        >
          <ArrowLeft size={16} />
          Back to coach
        </Link>
      </div>
    );
  }

  return (
    <ConversationView
      key={result.conversation.id}
      conversationId={result.conversation.id}
      title={result.conversation.title}
      initialMessages={result.conversation.messages}
    />
  );
}
