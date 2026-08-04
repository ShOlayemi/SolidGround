import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/actions";
import { getProfile } from "@/lib/profile/actions";
import { getMyPairings } from "@/lib/pairings/actions";
import { ChatPageClient, type ChatPartner } from "@/components/chat/ChatPageClient";

export const metadata = {
  title: "Chat",
  description: "Message your active partners on SolidGround AI.",
};

export default async function ChatPage() {
  const session = await getSession();
  if (!session) redirect("/login?redirect=%2Fdashboard%2Fchat");

  const [pairingsResult, profile] = await Promise.all([getMyPairings(), getProfile()]);
  if (!pairingsResult.success) {
    return (
      <div className="mx-auto max-w-[640px] py-20 text-center">
        <h1 className="text-2xl font-semibold text-text-primary">Unable to load chats</h1>
        <p className="mt-3 text-sm text-text-secondary">{pairingsResult.error ?? "Please try again in a moment."}</p>
      </div>
    );
  }

  const activePairings = (pairingsResult.pairings ?? []).filter(
    (pairing) => pairing.status === "active",
  );
  const userName = profile?.display_name ?? profile?.full_name ?? session.user.email?.split("@")[0] ?? "You";
  const partners: ChatPartner[] = activePairings.map((pairing) => {
    const isInviter = pairing.inviter_user_id === session.user.id;
    const name = isInviter ? pairing.invitee_name ?? "Partner" : pairing.inviter_name;
    const avatarUrl = isInviter ? pairing.invitee_avatar_url : pairing.inviter_avatar_url;
    return {
      id: pairing.id,
      name,
      avatarUrl: avatarUrl ?? null,
      initials: name.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
    };
  });

  if (partners.length === 0) {
    return (
      <div className="mx-auto max-w-[760px] py-8 md:py-10">
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary">Chat</h1>
        <div className="mt-8 rounded-2xl border border-card-border bg-card-bg p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-100 text-accent-700">💬</div>
          <h2 className="mt-5 text-xl font-semibold text-text-primary">Your conversations start with a connection</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-secondary">
            Discover people who share your relationship goals, then start a conversation once you&apos;re paired.
          </p>
          <Link href="/dashboard/discover" className="mt-6 inline-flex rounded-lg bg-accent-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-700">
            Discover people
          </Link>
        </div>
      </div>
    );
  }

  return <ChatPageClient partners={partners} userName={userName} />;
}
