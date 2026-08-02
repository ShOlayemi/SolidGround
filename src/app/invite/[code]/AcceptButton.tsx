"use client";

// ──────────────────────────────────────────────────────────────
// SolidGround AI — Accept Invite Button (client component)
// ──────────────────────────────────────────────────────────────

import { useState } from "react";
import { useRouter } from "next/navigation";
import { acceptInvite } from "@/lib/pairings/actions";
import { Button } from "@/components/ui/Button";
import { trackEvent } from "@/lib/analytics/events";

interface AcceptButtonProps {
  inviteCode: string;
}

export function AcceptButton({ inviteCode }: AcceptButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setLoading(true);
    setError(null);
    try {
      const result = await acceptInvite(inviteCode);
      if (result.success && result.pairingId) {
        trackEvent("partner_invite_accepted");
        router.push(`/dashboard/pairings/${result.pairingId}`);
      } else {
        setError(result.error ?? "Failed to accept invite.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Button
        variant="filled"
        size="lg"
        onClick={handleAccept}
        disabled={loading}
        type="button"
        className="w-full"
      >
        {loading ? "Accepting..." : "Accept Invite"}
      </Button>
      {error && (
        <p className="text-[13px] text-solid-error mt-3">{error}</p>
      )}
    </div>
  );
}
