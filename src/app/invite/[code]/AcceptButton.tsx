"use client";

// ──────────────────────────────────────────────────────────────
// SolidGround AI — Accept Invite (auto + manual fallback)
// ──────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { acceptInvite } from "@/lib/pairings/actions";
import { Button } from "@/components/ui/Button";
import { trackEvent } from "@/lib/analytics/events";

interface AcceptButtonProps {
  inviteCode: string;
  autoAccept?: boolean;
}

export function AcceptButton({ inviteCode, autoAccept = false }: AcceptButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attemptedRef = useRef(false);

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

  // Auto-accept on mount when the user already has a completed assessment
  useEffect(() => {
    if (autoAccept && !attemptedRef.current) {
      attemptedRef.current = true;
      handleAccept();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAccept]);

  return (
    <div>
      {autoAccept ? (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 text-[15px] text-solid-text-secondary">
            <svg className="animate-spin h-5 w-5 text-solid-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {loading ? "Accepting invite…" : error ? null : "Preparing your Alignment Match™…"}
          </div>
          {error && (
            <div className="text-center">
              <p className="text-[13px] text-solid-error mb-3">{error}</p>
              <Button variant="filled" size="md" onClick={handleAccept} disabled={loading}>
                Try Again
              </Button>
            </div>
          )}
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
