import { getSession } from "@/lib/auth/actions";
import { getProfile } from "@/lib/profile/actions";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { FeedbackWidgetLazy } from "@/components/feedback/FeedbackWidgetLazy";
import { NPSHostLazy } from "@/components/feedback/NPSHostLazy";
import { getNPSEligibility } from "@/lib/feedback/actions";
import { getConnectionRequests } from "@/lib/connections/actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const [npsResult, connectionRequests, profile] = await Promise.all([
    getNPSEligibility(session.user.id),
    getConnectionRequests(),
    getProfile(),
  ]);

  const userEmail = session.user.email ?? "";
  const userName =
    (session.user.user_metadata?.full_name as string) ??
    session.user.email?.split("@")[0] ??
    "User";

  return (
    <div className="min-h-screen bg-content-bg">
      <Sidebar
        userEmail={userEmail}
        userName={profile?.display_name ?? profile?.full_name ?? userName}
        avatarUrl={profile?.avatar_url}
        pendingRequestCount={connectionRequests.success ? connectionRequests.unreadCount : 0}
      />

      {/* Main content area — offset by sidebar width */}
      <main id="main-content" className="transition-[margin] duration-200 ease-out ml-0 md:ml-16 lg:ml-60">
        <div className="max-w-[1200px] mx-auto px-4 py-6 sm:px-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
          <div className="mb-4 flex justify-end"><NotificationBell userId={session.user.id} /></div>
          {children}
        </div>
      </main>

      {/* Floating feedback widget on all dashboard pages (lazy — code-split) */}
      <FeedbackWidgetLazy userId={session.user.id} />

      {/* NPS survey — triggers after the 3rd dashboard visit (lazy — code-split) */}
      <NPSHostLazy
        userId={session.user.id}
        eligible={npsResult.success && npsResult.eligible}
      />
    </div>
  );
}
