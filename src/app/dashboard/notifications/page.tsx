import { getSession } from "@/lib/auth/actions";
import { getNotificationPreferences } from "@/lib/notifications/actions";
import { redirect } from "next/navigation";
import { PreferencesForm } from "./PreferencesForm";

import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Notifications",
  description: "Your notification preferences and activity.",
};
export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const result = await getNotificationPreferences(session.user.id);
  return <div className="max-w-[800px]"><header className="mb-8"><h1 className="text-3xl font-semibold tracking-tight text-text-primary">Notifications</h1><p className="mt-2 text-text-secondary">Choose how SolidGround keeps you informed.</p></header><PreferencesForm userId={session.user.id} initial={result.preferences} /></div>;
}
