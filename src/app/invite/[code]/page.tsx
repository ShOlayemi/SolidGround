// ──────────────────────────────────────────────────────────────
// SolidGround AI — Invite Accept Page
// ──────────────────────────────────────────────────────────────

import Link from "next/link";
import { redirect } from "next/navigation";
import { getInvite, acceptInvite } from "@/lib/pairings/actions";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { AcceptButton } from "./AcceptButton";

interface InvitePageProps {
  params: Promise<{ code: string }>;
}

import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Accept a Pairing Invite",
  description: "Accept an Alignment Match™ invite and compare your Compatibility Blueprint with your partner.",
};
export default async function InvitePage({ params }: InvitePageProps) {
  const { code } = await params;

  // Fetch invite info (public)
  const invite = await getInvite(code);

  if (!invite.success) {
    return (
      <div className="min-h-screen bg-solid-bg flex items-center justify-center px-4">
        <div className="max-w-[440px] w-full text-center">
          <div className="bg-solid-surface border border-solid-border rounded-2xl p-8 md:p-10">
            <h1 className="text-[24px] font-semibold tracking-tight text-solid-text mb-3">
              Invite not found
            </h1>
            <p className="text-[15px] text-solid-text-secondary mb-6">
              {invite.error === "Invite not found."
                ? "This invite link is invalid or has expired."
                : invite.error}
            </p>
            <Link href="/">
              <Button variant="filled" size="md">
                Go Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Check auth
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const isAuthenticated = !!session;

  // If not authenticated, show signup prompt
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-solid-bg flex items-center justify-center px-4">
        <div className="max-w-[440px] w-full text-center">
          <div className="bg-solid-surface border border-solid-border rounded-2xl p-8 md:p-10">
            <h1 className="text-[24px] font-semibold tracking-tight text-solid-text mb-3">
              You&apos;ve been invited
            </h1>
            <p className="text-[15px] text-solid-text-secondary mb-2">
              <strong>{invite.inviterName}</strong> has invited you to compare
              Compatibility Blueprints.
            </p>
            <p className="text-[14px] text-solid-text-tertiary mb-8">
              Create an account and complete your assessment to see how your
              relationship styles align.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href={`/signup?redirect=/invite/${code}`}>
                <Button variant="filled" size="md">
                  Sign up to accept
                </Button>
              </Link>
              <Link href={`/login?redirect=/invite/${code}`}>
                <Button variant="ghost" size="md">
                  Sign in instead
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check if invitee has a completed assessment
  const { data: completedSession } = await supabase
    .from("assessment_sessions")
    .select("id")
    .eq("user_id", session.user.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Check if this invite has already been used
  if (invite.status !== "pending") {
    // Already accepted/completed — redirect to pairing results if the user is the invitee
    const { data: pairing } = await supabase
      .from("pairings")
      .select("id, invitee_user_id")
      .eq("invite_code", code)
      .single();

    if (pairing && pairing.invitee_user_id === session.user.id) {
      redirect(`/dashboard/pairings/${pairing.id}`);
    }

    return (
      <div className="min-h-screen bg-solid-bg flex items-center justify-center px-4">
        <div className="max-w-[440px] w-full text-center">
          <div className="bg-solid-surface border border-solid-border rounded-2xl p-8 md:p-10">
            <h1 className="text-[24px] font-semibold tracking-tight text-solid-text mb-3">
              This invite is no longer available
            </h1>
            <p className="text-[15px] text-solid-text-secondary mb-6">
              The invite has already been accepted or is no longer valid.
            </p>
            <Link href="/dashboard">
              <Button variant="filled" size="md">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated but no completed assessment
  if (!completedSession) {
    return (
      <div className="min-h-screen bg-solid-bg flex items-center justify-center px-4">
        <div className="max-w-[440px] w-full text-center">
          <div className="bg-solid-surface border border-solid-border rounded-2xl p-8 md:p-10">
            <h1 className="text-[24px] font-semibold tracking-tight text-solid-text mb-3">
              Complete your Blueprint first
            </h1>
            <p className="text-[15px] text-solid-text-secondary mb-2">
              <strong>{invite.inviterName}</strong> has invited you to compare
              Compatibility Blueprints.
            </p>
            <p className="text-[14px] text-solid-text-tertiary mb-8">
              You need to complete your own Compatibility Blueprint assessment
              before you can compare results with your partner.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href={`/dashboard/blueprint/assess?inviteCode=${encodeURIComponent(code)}`}>
                <Button variant="filled" size="md">
                  Start Your Blueprint
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="ghost" size="md">
                  Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated with completed assessment — show accept button
  return (
    <div className="min-h-screen bg-solid-bg flex items-center justify-center px-4">
      <div className="max-w-[440px] w-full text-center">
        <div className="bg-solid-surface border border-solid-border rounded-2xl p-8 md:p-10">
          <h1 className="text-[24px] font-semibold tracking-tight text-solid-text mb-3">
            You&apos;ve been invited
          </h1>
          <p className="text-[15px] text-solid-text-secondary mb-2">
            <strong>{invite.inviterName}</strong> wants to compare Compatibility
            Blueprints with you.
          </p>
          <p className="text-[14px] text-solid-text-tertiary mb-2">
            Accepting will generate an Alignment Match™ comparing your results
            across all 12 categories.
          </p>
          <p className="text-[12px] text-solid-text-tertiary mb-8">
            Your Compatibility Blueprint is ready ✓
          </p>
          <AcceptButton inviteCode={code} autoAccept />
        </div>
      </div>
    </div>
  );
}
