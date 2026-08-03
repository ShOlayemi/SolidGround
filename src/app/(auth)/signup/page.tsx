"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signUp } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { trackEvent } from "@/lib/analytics/events";

export const dynamic = "force-dynamic";

function SignupForm() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") ?? "";
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const redirectPath = searchParams.get("redirect") ?? undefined;
    setError("");

    // Client-side validation
    if (!fullName || fullName.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const result = await signUp(email, password, fullName, redirectPath);
    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "Something went wrong.");
      return;
    }

    trackEvent("signup", { method: "email" });
    setSuccess(true);
  }

  if (success) {
    return (
      <>
        <h1 className="text-[24px] leading-[1.3] font-semibold tracking-tight text-solid-text mb-2">
          Check your email
        </h1>
        <p className="text-[15px] text-solid-text-secondary mb-8">
          We&apos;ve sent a verification link to <strong>{email}</strong>.
          Click the link to verify your account and get started.
        </p>
        <p className="text-[14px] text-solid-text-tertiary">
          Didn&apos;t receive the email? Check your spam folder, or{" "}
          <button
            type="button"
            onClick={() => setSuccess(false)}
            className="text-solid-accent hover:text-solid-accent-hover font-medium transition-colors"
          >
            try again
          </button>
          .
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="text-[24px] leading-[1.3] font-semibold tracking-tight text-solid-text mb-2">
        Create your account
      </h1>
      <p className="text-[15px] text-solid-text-secondary mb-8">
        Start your Compatibility Blueprint.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label
            htmlFor="fullName"
            className="block text-[13px] font-medium text-solid-text-secondary"
          >
            Full name
          </label>
          <Input
            id="fullName"
            type="text"
            placeholder="Jane Smith"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={loading}
            autoComplete="name"
          />
        </div>

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
            placeholder="jane@example.com"
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
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            autoComplete="new-password"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="confirmPassword"
            className="block text-[13px] font-medium text-solid-text-secondary"
          >
            Confirm password
          </label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            autoComplete="new-password"
          />
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
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-[14px] text-solid-text-tertiary">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-solid-accent hover:text-solid-accent-hover font-medium transition-colors"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
