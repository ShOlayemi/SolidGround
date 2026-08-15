"use client";

// ──────────────────────────────────────────────────────────────
// SolidGround AI — Coach Conversation (thread + composer)
// ──────────────────────────────────────────────────────────────
// Client surface for /dashboard/coach/[conversationId]. The thread is
// loaded server-side (getConversation) and passed in; sending goes
// through the sendCoachMessage server action — never Supabase directly.
//
// Behavior (mirrors the mobile coach conversation screen):
//  - User messages right-aligned, coach messages left-aligned, date
//    dividers and per-message times.
//  - Optimistic send: the user's message renders immediately with a
//    "sending" state; the returned coach reply is appended on success.
//  - On failure (ok:false): the user message is kept in the thread,
//    marked failed, with the error shown inline and a Retry action
//    that re-sends the same text.
//  - Composer: Enter sends, Shift+Enter inserts a newline, disabled
//    while a reply is in flight.
//  - Empty conversation: suggested prompt chips that send on tap.
//  - Brief AI disclosure near the composer (§20 — copy matches mobile).
// ──────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, RotateCw, Send, Sparkles } from "lucide-react";
import { sendCoachMessage } from "@/lib/coach/actions";
import type { CoachMessage } from "@/lib/coach/actions";
import { formatDateDivider, formatMessageTime } from "@/lib/coach/format";
import { getGeneralSuggestions } from "@/lib/coach/suggestions";
import { COACH_DISCLOSURE_TEXT } from "@/lib/coach/disclosure";

/** A thread message with a local delivery status for the optimistic send. */
type ThreadMessage = CoachMessage & { status?: "sending" | "sent" | "failed"; error?: string };

const GENERIC_SEND_ERROR = "The coach couldn\u2019t reply right now. Please try again.";

// Module-scoped counter for optimistic message ids — keeps the send
// handler pure during render (react-hooks/purity) while guaranteeing
// uniqueness within this thread view.
let localMessageCounter = 0;
function nextLocalMessageId(): string {
  localMessageCounter += 1;
  return `local-${localMessageCounter}`;
}

interface ConversationViewProps {
  conversationId: string;
  title: string;
  initialMessages: CoachMessage[];
}

export function ConversationView({ conversationId, title, initialMessages }: ConversationViewProps) {
  const [messages, setMessages] = useState<ThreadMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);
  const initialScrollDone = useRef(false);

  const suggestions = getGeneralSuggestions();
  const showSuggestions = messages.length === 0 && !sending;

  const scrollToBottom = useCallback((smooth: boolean) => {
    if (!shouldAutoScroll.current) return;
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "end" });
  }, []);

  // Scroll to the bottom once the thread first renders (instant), then
  // follow new messages while the user is near the bottom.
  useEffect(() => {
    if (!initialScrollDone.current && messages.length > 0) {
      initialScrollDone.current = true;
      scrollToBottom(false);
    }
  }, [messages.length, scrollToBottom]);

  useEffect(() => {
    if (initialScrollDone.current) scrollToBottom(true);
  }, [messages.length, scrollToBottom]);

  function handleScroll() {
    const el = scrollContainerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    shouldAutoScroll.current = nearBottom;
  }

  /**
   * Send `text`. When `targetId` is provided (a retry), the existing
   * failed message is re-marked "sending" instead of inserting a new
   * optimistic bubble.
   */
  async function sendText(text: string, targetId?: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    shouldAutoScroll.current = true;

    const optimisticId = targetId ?? nextLocalMessageId();

    if (targetId) {
      setMessages((prev) =>
        prev.map((m) => (m.id === targetId ? { ...m, status: "sending" as const, error: undefined } : m)),
      );
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: optimisticId,
          conversationId,
          role: "user",
          content: trimmed,
          createdAt: new Date().toISOString(),
          status: "sending",
        },
      ]);
      setInput("");
    }

    try {
      const result = await sendCoachMessage(conversationId, trimmed);
      if (result.ok && result.coachMessage) {
        setMessages((prev) => [
          ...prev.map((m) => (m.id === optimisticId ? { ...m, status: "sent" as const } : m)),
          { ...result.coachMessage!, status: "sent" },
        ]);
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimisticId
              ? { ...m, status: "failed" as const, error: result.error ?? GENERIC_SEND_ERROR }
              : m,
          ),
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticId
            ? { ...m, status: "failed" as const, error: GENERIC_SEND_ERROR }
            : m,
        ),
      );
    } finally {
      setSending(false);
    }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendText(input);
    }
  }

  const canSend = input.trim().length > 0 && !sending;

  return (
    <div className="mx-auto max-w-[760px]">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/dashboard/coach"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-card-border bg-card-bg text-text-secondary transition hover:bg-card-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
          aria-label="Back to coach"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-accent-600">
            SolidGround Coach
          </p>
          <h1 className="truncate text-xl font-semibold tracking-tight text-text-primary md:text-2xl">
            {title || "New conversation"}
          </h1>
        </div>
      </div>

      {/* ── Thread card ────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-card-border bg-card-bg">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="h-[52vh] min-h-[380px] overflow-y-auto px-4 py-5 md:px-6"
          aria-live="polite"
          aria-label="Conversation with the coach"
        >
          {showSuggestions ? (
            <div className="flex h-full flex-col items-center justify-center py-10 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-100 text-accent-700">
                <Sparkles size={22} />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-[1.5px] text-accent-600">
                A private space to think
              </p>
              <h2 className="mt-2 text-xl font-semibold text-text-primary">What&apos;s on your mind?</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-secondary">
                Ask anything about your relationships — communication, money, family, values, or
                where you&apos;re headed. There are no wrong questions here.
              </p>
              <div className="mt-6 flex max-w-md flex-col gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    disabled={sending}
                    onClick={() => void sendText(suggestion.prompt)}
                    className="rounded-xl border border-card-border bg-card-bg px-4 py-2.5 text-left text-sm font-medium text-text-secondary transition hover:border-accent-300 hover:bg-card-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:opacity-50"
                  >
                    {suggestion.prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col">
              {messages.map((message, index) => {
                const previous = messages[index - 1];
                const date = new Date(message.createdAt);
                const previousDate = previous ? new Date(previous.createdAt) : null;
                const showDivider =
                  index === 0 ||
                  !previousDate ||
                  Number.isNaN(date.getTime()) ||
                  Number.isNaN(previousDate.getTime()) ||
                  date.toDateString() !== previousDate.toDateString();
                const isUser = message.role === "user";
                return (
                  <div key={message.id}>
                    {showDivider ? (
                      <div className="my-5 flex items-center gap-3 first:mt-0" role="separator">
                        <div className="h-px flex-1 bg-card-border" />
                        <span className="text-[11px] font-medium text-text-tertiary">
                          {formatDateDivider(message.createdAt)}
                        </span>
                        <div className="h-px flex-1 bg-card-border" />
                      </div>
                    ) : null}
                    <div className={`mb-4 flex ${isUser ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 md:max-w-[78%] ${
                          isUser
                            ? "rounded-br-md bg-accent-600 text-white"
                            : "rounded-bl-md border border-card-border bg-slate-50 text-text-primary"
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                        <time
                          className={`mt-1 block text-[10px] ${isUser ? "text-white/60" : "text-text-tertiary"}`}
                          dateTime={message.createdAt}
                        >
                          {formatMessageTime(message.createdAt)}
                        </time>
                      </div>
                    </div>
                    {message.status === "failed" ? (
                      <div
                        role="alert"
                        className="mb-4 flex items-center gap-2 rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-xs text-danger-700"
                      >
                        <span className="min-w-0 flex-1">{message.error ?? GENERIC_SEND_ERROR}</span>
                        <button
                          type="button"
                          onClick={() => void sendText(message.content, message.id)}
                          disabled={sending}
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 font-semibold text-danger-700 transition hover:bg-danger-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-500 disabled:opacity-50"
                        >
                          <RotateCw size={12} className={sending ? "animate-spin" : ""} />
                          Retry
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {sending ? (
                <div className="flex items-center gap-2 py-2 pl-1 text-sm text-text-tertiary">
                  <Loader2 size={15} className="animate-spin" />
                  <span className="italic">Thinking…</span>
                </div>
              ) : null}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* ── Composer ─────────────────────────────────────── */}
        <div className="border-t border-card-border bg-content-bg p-3 md:p-4">
          <div className="flex items-end gap-3">
            <label htmlFor="coach-message-input" className="sr-only">
              Message the coach
            </label>
            <textarea
              id="coach-message-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder="Write a message…"
              maxLength={4000}
              rows={1}
              disabled={sending}
              className="max-h-32 min-w-0 flex-1 resize-none rounded-xl border border-card-border bg-card-bg px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-400 focus-visible:ring-2 focus-visible:ring-accent-500 disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => void sendText(input)}
              disabled={!canSend}
              aria-label="Send message"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-600 text-white transition hover:bg-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
            </button>
          </div>
          <p className="mt-3 text-center text-[11px] leading-relaxed text-text-tertiary">
            {COACH_DISCLOSURE_TEXT} Enter to send, Shift+Enter for a new line.
          </p>
        </div>
      </div>
    </div>
  );
}
