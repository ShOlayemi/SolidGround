"use client";

import { useState } from "react";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { partnerLabel } from "@/lib/mode";
import type { RelationshipType } from "@/types";

export interface ChatPartner {
  id: string;
  name: string;
  avatarUrl: string | null;
  initials: string;
}

interface ChatPageClientProps {
  partners: ChatPartner[];
  userName: string;
  mode?: RelationshipType;
}

export function ChatPageClient({ partners, userName, mode }: ChatPageClientProps) {
  const pLabel = partnerLabel(mode);
  const [selectedId, setSelectedId] = useState<string | null>(
    partners.length === 1 ? partners[0].id : null,
  );
  const selectedPartner = partners.find((partner) => partner.id === selectedId);

  if (selectedPartner) {
    return (
      <div className="mx-auto max-w-[760px] py-8 md:py-10">
        {partners.length > 1 ? (
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-text-secondary transition hover:text-text-primary"
          >
            <ArrowLeft size={16} />
            All conversations
          </button>
        ) : null}
        <div className="mb-6 flex items-center gap-3">
          <Avatar src={selectedPartner.avatarUrl} alt={selectedPartner.name} size="md" initials={selectedPartner.initials} />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Chat with {selectedPartner.name}</h1>
            <p className="mt-1 text-sm text-text-secondary">Your private conversation</p>
          </div>
        </div>
        <ChatPanel pairingId={selectedPartner.id} userName={userName} mode={mode} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[760px] py-8 md:py-10">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-100 text-accent-700">
          <MessageCircle size={21} />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-text-primary">Chat</h1>
          <p className="mt-1 text-sm text-text-secondary">{`Select a ${pLabel} to start a conversation.`}</p>
        </div>
      </div>
      <div className="space-y-3">
        {partners.map((partner) => (
          <button
            key={partner.id}
            type="button"
            onClick={() => setSelectedId(partner.id)}
            className="flex w-full items-center gap-4 rounded-xl border border-card-border bg-card-bg p-4 text-left transition hover:border-accent-300 hover:bg-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
          >
            <Avatar src={partner.avatarUrl} alt="" size="md" initials={partner.initials} />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary">{partner.name}</span>
            <span className="text-sm font-medium text-accent-600">Open chat →</span>
          </button>
        ))}
      </div>
    </div>
  );
}
