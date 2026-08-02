import { redirect } from "next/navigation";
import { Shield, AlertTriangle } from "lucide-react";
import { hasExistingAdmin, makeAdmin } from "@/lib/admin/actions";
import { getSession } from "@/lib/auth/actions";
import { SetupForm } from "./SetupForm";

import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Admin Setup",
  description: "Create the first administrator account.",
};
export default async function AdminSetupPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const alreadyHasAdmin = await hasExistingAdmin();

  if (alreadyHasAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center max-w-md">
          <AlertTriangle size={32} className="mx-auto text-amber-500" />
          <h1 className="mt-4 text-xl font-semibold text-text-primary">Admin Already Exists</h1>
          <p className="mt-2 text-sm text-text-secondary">
            An administrator account already exists. Only an existing admin can promote additional administrators.
          </p>
          <a
            href="/dashboard"
            className="mt-6 inline-block rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md rounded-xl border border-card-border bg-card-bg p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-amber-50">
          <Shield size={28} className="text-amber-600" />
        </div>
        <h1 className="mt-4 text-center text-xl font-semibold text-text-primary">
          Admin Setup
        </h1>
        <p className="mt-2 text-center text-sm text-text-secondary">
          No administrator exists yet. As the first user, you can claim the admin role to manage the platform.
        </p>
        <SetupForm />
      </div>
    </div>
  );
}
