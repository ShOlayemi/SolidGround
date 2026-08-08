"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Clipboard, Link2, Loader2, Send } from "lucide-react";
import { createInvite } from "@/lib/pairings/actions";
import { Button } from "@/components/ui/Button";
import type { RelationshipType } from "@/types";

type InvitePartnerProps = {
  sessionId: string;
  initialInviteCode?: string;
};

const inviteUrl = (inviteCode: string) =>
  `https://site-temp-one.vercel.app/invite/${inviteCode}`;

export function InvitePartner({ sessionId, initialInviteCode }: InvitePartnerProps) {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState(initialInviteCode);
  const [isCreating, setIsCreating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [relationshipType, setRelationshipType] = useState<RelationshipType>("romantic");

  async function handleCreateInvite() {
    setError(null);
    setIsCreating(true);

    try {
      const result = await createInvite(sessionId, undefined, relationshipType);
      if (!result.success || !result.inviteCode) {
        setError(result.error ?? "We couldn't create your invite. Please try again.");
        return;
      }
      setInviteCode(result.inviteCode);
      router.refresh();
    } catch (err) {
      console.error("Create invite failed:", err);
      setError("We couldn't create your invite. Please try again.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleCopy() {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteUrl(inviteCode));
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 2000);
    } catch {
      setError("Copy failed. Select the link and copy it manually.");
    }
  }

  return (
    <section className="mb-8 rounded-2xl border border-accent-200 bg-accent-50/50 p-6 md:p-7" aria-labelledby="invite-partner-heading">
      <div className="flex items-start gap-4">
        <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-100 text-accent-700 sm:flex">
          <Send size={18} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-accent-700">Alignment Match™</p>
          <h2 id="invite-partner-heading" className="text-[19px] font-semibold text-solid-text">Invite a partner</h2>
          <p className="mt-1.5 max-w-[600px] text-[14px] leading-relaxed text-solid-text-secondary">
            Share a private link with someone you care about to compare your compatibility profiles.
          </p>
          <fieldset className="mt-4"><legend className="text-[13px] font-medium text-solid-text">Compare as:</legend><div className="mt-2 flex gap-4"><label><input type="radio" name="relationshipType" value="romantic" checked={relationshipType === "romantic"} onChange={() => setRelationshipType("romantic")} /> <span className="ml-1 text-sm">Romantic partner</span></label><label><input type="radio" name="relationshipType" value="platonic" checked={relationshipType === "platonic"} onChange={() => setRelationshipType("platonic")} /> <span className="ml-1 text-sm">Friend (platonic)</span></label></div></fieldset>

          {inviteCode ? (
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <div className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 rounded-lg border border-solid-border bg-white px-3 text-[13px] text-solid-text-secondary" aria-label="Partner invite link">
                <Link2 size={16} className="shrink-0 text-accent-600" aria-hidden="true" />
                <span className="truncate">{inviteUrl(inviteCode)}</span>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleCopy} aria-label="Copy invite link">
                {isCopied ? <Check size={16} aria-hidden="true" /> : <Clipboard size={16} aria-hidden="true" />}
                {isCopied ? "Copied" : "Copy Link"}
              </Button>
            </div>
          ) : (
            <Button type="button" className="mt-5" size="md" onClick={handleCreateInvite} disabled={isCreating}>
              {isCreating ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : <Link2 size={17} aria-hidden="true" />}
              {isCreating ? "Generating link…" : "Generate Invite Link"}
            </Button>
          )}

          {error ? <p className="mt-3 text-[13px] text-red-600" role="alert">{error}</p> : null}
        </div>
      </div>
    </section>
  );
}
