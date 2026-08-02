import { getSession } from "@/lib/auth/actions";
import { SettingsClient } from "./SettingsClient";

import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your SolidGround AI account settings.",
};
export default async function SettingsPage() {
  const session = await getSession();
  const email = session?.user.email ?? "";
  const name = (session?.user.user_metadata?.full_name as string | undefined) ?? email.split("@")[0] ?? "User";
  return <SettingsClient name={name} email={email} />;
}
