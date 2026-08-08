"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Send, MessageCircle } from "lucide-react";
import { getMessages, sendMessage } from "@/lib/pairings/actions";
import type { PairingMessage } from "@/types";

interface ChatPanelProps { pairingId: string; userName: string }

function isSameDay(first: Date, second: Date): boolean {
  return first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate();
}

function formatDateDivider(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Earlier";

  const today = new Date();
  if (isSameDay(date, today)) return "Today";

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(date, yesterday)) return "Yesterday";

  return date.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

function formatMessageTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function ChatPanel({ pairingId, userName }: ChatPanelProps) {
  const [messages, setMessages] = useState<PairingMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (shouldAutoScroll.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  const loadMessages = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    const result = await getMessages(pairingId);
    if (result.success) {
      setMessages(result.messages ?? []);
      setError(false);
    } else setError(true);
    if (initial) setLoading(false);
  }, [pairingId]);

  useEffect(() => {
    void loadMessages(true);
    const interval = window.setInterval(() => void loadMessages(), 5000);
    return () => window.clearInterval(interval);
  }, [loadMessages]);

  // Auto-scroll on initial load only, not on poll updates
  const initialLoadDone = useRef(false);
  useEffect(() => {
    if (!initialLoadDone.current && messages.length > 0 && !loading) {
      initialLoadDone.current = true;
      scrollToBottom();
    }
  }, [messages, loading, scrollToBottom]);

  // Detect manual scroll to stop auto-scrolling
  function handleScroll() {
    const el = scrollContainerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    shouldAutoScroll.current = nearBottom;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || sending) return;
    setSending(true);
    const result = await sendMessage(pairingId, trimmed);
    if (result.success) {
      setContent("");
      shouldAutoScroll.current = true;
      await loadMessages();
      scrollToBottom();
    }
    else setError(true);
    setSending(false);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-solid-border bg-solid-surface">
      <div ref={scrollContainerRef} onScroll={handleScroll} className="h-[340px] overflow-y-auto p-4 md:p-6" aria-live="polite">
        {loading ? <div className="space-y-4">{[1, 2, 3].map((row) => <div key={row} className={`flex ${row % 2 ? "justify-start" : "justify-end"}`}><div className="h-14 w-2/3 animate-pulse rounded-2xl bg-slate-200" /></div>)}</div> : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center"><p className="text-sm text-red-600">Unable to load messages</p><button type="button" onClick={() => void loadMessages(true)} className="text-sm font-medium text-solid-accent underline">Try again</button></div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center"><div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-solid-bg text-solid-text-tertiary"><MessageCircle size={22} /></div><p className="text-sm font-medium text-solid-text">Start a conversation about your results</p><p className="mt-1 text-xs text-solid-text-tertiary">Share a thought or ask a question about your Alignment Match™.</p></div>
        ) : messages.map((message, index) => {
          const mine = message.isCurrentUser ?? message.senderName === userName;
          const messageDate = new Date(message.createdAt);
          const previousMessage = messages[index - 1];
          const previousDate = previousMessage ? new Date(previousMessage.createdAt) : null;
          const showDateDivider = index === 0 || !previousDate || Number.isNaN(messageDate.getTime()) || Number.isNaN(previousDate.getTime()) || !isSameDay(messageDate, previousDate);
          return <div key={message.id}>
            {showDateDivider ? <div className="my-5 flex items-center gap-3 first:mt-0" role="separator"><div className="h-px flex-1 bg-solid-border" /><span className="text-[11px] font-medium text-solid-text-tertiary">{formatDateDivider(message.createdAt)}</span><div className="h-px flex-1 bg-solid-border" /></div> : null}
            <div className={`mb-4 flex ${mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[80%] rounded-2xl px-4 py-3 ${mine ? "rounded-br-md bg-solid-accent text-white" : "rounded-bl-md bg-slate-100 text-solid-text"}`}><p className={`mb-1 text-[11px] font-semibold ${mine ? "text-white/70" : "text-solid-text-tertiary"}`}>{mine ? userName : message.senderName ?? "Partner"}</p><p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p><time className={`mt-1 block text-[10px] ${mine ? "text-white/60" : "text-solid-text-tertiary"}`} dateTime={message.createdAt}>{formatMessageTime(message.createdAt)}</time></div></div>
          </div>;
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSubmit} className="flex gap-3 border-t border-solid-border bg-solid-bg p-3 md:p-4"><label htmlFor="partner-message" className="sr-only">Message your partner</label><input id="partner-message" value={content} onChange={(event) => setContent(event.target.value)} placeholder="Write a message..." maxLength={2000} className="min-w-0 flex-1 rounded-xl border border-solid-border bg-solid-surface px-4 py-3 text-sm text-solid-text outline-none transition focus:border-solid-accent" disabled={sending} /><button type="submit" disabled={sending || !content.trim()} aria-label="Send message" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-solid-accent text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"><Send size={17} /></button></form>
    </div>
  );
}
