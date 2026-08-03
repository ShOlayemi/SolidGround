"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { trackEvent } from "@/lib/analytics/events";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "Something went wrong.");
      return;
    }

    trackEvent("login", { method: "email" });
    const redirectPath = searchParams.get("redirect");
    const destination = redirectPath?.startsWith("/") && !redirectPath.startsWith("//")
      ? redirectPath
      : "/dashboard";
    router.push(destination);
    router.refresh();
  }

  return (
    <>
      <h1 className="text-[24px] leading-[1.3] font-semibold tracking-tight text-solid-text mb-2">
        Welcome back
      </h1>
      <p className="text-[15px] text-solid-text-secondary mb-8">
        Sign in to your SolidGround account.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="block text-[13px] font-medium text-solid-text-secondary"
          >
            Email
          </label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            autoComplete="email"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="block text-[13px] font-medium text-solid-text-secondary"
          >
            Password
          </label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            autoComplete="current-password"
          />
          {/* Use text type with manual masking via CSS? Let's use input type password properly */}
          {/* Actually Input doesn't support password type – need to adjust */}
        </div>

        {error && (
          <p className="text-[14px] text-solid-error bg-solid-error/5 border border-solid-error/20 rounded-lg px-4 py-2.5">
            {error}
          </p>
        )}

        <Button
          type="submit"
          variant="filled"
          className="w-full"
          disabled={loading}
        >
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="mt-6 flex flex-col gap-3 text-center text-[14px]">
        <Link
          href="/reset-password"
          className="text-solid-text-secondary hover:text-solid-text transition-colors"
        >
          Forgot your password?
        </Link>
        <p className="text-solid-text-tertiary">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="text-solid-accent hover:text-solid-accent-hover font-medium transition-colors"
          >
            Create one
          </Link>
        </p>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center text-sm text-solid-text-secondary">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
