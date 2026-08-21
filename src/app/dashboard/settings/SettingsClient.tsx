"use client";
import { useState } from "react";
import { signOut } from "@/lib/auth/actions";
import { AIModeToggle } from "@/components/dev/AIModeToggle";
import { AIDebugPanel } from "@/components/dev/AIDebugPanel";

export function SettingsClient({ name, email }: { name: string; email: string }) {
  const [notifications, setNotifications] = useState(true);
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="max-w-[800px]">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary">Settings</h1>
        <p className="mt-2 text-text-secondary">Manage your account and preferences.</p>
      </header>

      <section className="rounded-xl border border-card-border bg-card-bg p-6">
        <h2 className="text-lg font-semibold text-text-primary">Profile</h2>
        <div className="mt-5 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-100 font-semibold text-accent-700">
            {initials}
          </div>
          <div>
            <p className="font-medium text-text-primary">{name}</p>
            <p className="text-sm text-text-secondary">{email}</p>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-card-border bg-card-bg p-6">
        <h2 className="text-lg font-semibold text-text-primary">Notification preferences</h2>
        <div className="mt-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-text-primary">Email notifications</p>
            <p className="mt-1 text-sm text-text-secondary">
              Receive updates about your Blueprint and pairings.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={notifications}
            onClick={() => setNotifications((v) => !v)}
            className={`relative -m-2 p-2 h-7 w-12 rounded-full transition ${
              notifications ? "bg-accent-600" : "bg-slate-300"
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                notifications ? "left-6" : "left-1"
              }`}
            />
          </button>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-card-border bg-card-bg p-6">
        <h2 className="text-lg font-semibold text-text-primary">Data &amp; Privacy</h2>
        <div className="mt-5 flex flex-col gap-3 text-sm">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <a href="/dashboard/settings/privacy" className="font-medium text-accent-600">
              Privacy Center →
            </a>
            <a href="/dashboard/settings/blocked" className="font-medium text-accent-600">
              Blocked Users →
            </a>
            <a href="/privacy" className="font-medium text-accent-600">
              Privacy policy →
            </a>
            <button disabled className="text-text-tertiary">
              Download my data (Coming soon)
            </button>
          </div>
          <p className="text-[13px] leading-relaxed text-text-tertiary">
            The Privacy Center lays out what SolidGround stores and who can
            see it. Blocking someone stops them from inviting, messaging, or
            connecting with you.
          </p>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-card-border bg-card-bg p-6">
        <h2 className="text-lg font-semibold text-text-primary">Account</h2>
        <div className="mt-5 flex flex-wrap gap-3">
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              Sign out
            </button>
          </form>
          <button
            disabled
            className="rounded-lg border border-card-border px-4 py-2 text-sm text-text-tertiary"
          >
            Delete account
          </button>
        </div>
      </section>

      {process.env.NODE_ENV === "development" ? (
        <section className="mt-6 rounded-xl border border-card-border bg-card-bg p-6">
          <h2 className="text-lg font-semibold text-text-primary">Developer</h2>
          <div className="mt-5 space-y-6">
            <AIModeToggle />
            <AIDebugPanel />
          </div>
        </section>
      ) : null}
    </div>
  );
}
