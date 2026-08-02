import { getSession } from "@/lib/auth/actions";
import { getProfile } from "@/lib/profile/actions";
import { redirect } from "next/navigation";
import { ProfileContent } from "@/components/profile/ProfileContent";

import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Profile",
  description: "Edit your SolidGround AI profile.",
};
export default async function ProfilePage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const profile = await getProfile();

  return (
    <ProfileContent
      profile={profile}
      userId={session.user.id}
      userEmail={session.user.email ?? ""}
    />
  );
}
