"use client";
// ──────────────────────────────────────────────────────────────
// SolidGround AI — Chat Panel (lazy)
// Client-only wrapper that code-splits the partner chat (with its
// 5-second polling loop and message actions) out of the pairing
// page bundle, so the comparison report renders first. A chat-shaped
// skeleton stands in while the chunk loads.
// ──────────────────────────────────────────────────────────────
import dynamic from "next/dynamic";
import type { RelationshipType } from "@/types";

const ChatPanel = dynamic(
  () => import("./ChatPanel").then((m) => m.ChatPanel),
  {
    ssr: false,
    loading: () => (
      <div
        aria-hidden="true"
        className="overflow-hidden rounded-2xl border border-solid-border bg-solid-surface"
      >
        <div className="h-[340px] space-y-4 p-4 md:p-6">
          {[1, 2, 3].map((row) => (
            <div
              key={row}
              className={`flex ${row % 2 ? "justify-start" : "justify-end"}`}
            >
              <div className="h-14 w-2/3 animate-pulse rounded-2xl bg-slate-200" />
            </div>
          ))}
        </div>
        <div className="flex gap-3 border-t border-solid-border bg-solid-bg p-3 md:p-4">
          <div className="h-11 flex-1 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-11 w-11 animate-pulse rounded-xl bg-slate-200" />
        </div>
      </div>
    ),
  },
);

export function ChatPanelLazy({
  pairingId,
  userName,
  mode,
}: {
  pairingId: string;
  userName: string;
  mode?: RelationshipType;
}) {
  return <ChatPanel pairingId={pairingId} userName={userName} mode={mode} />;
}
