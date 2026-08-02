"use client";

import { useState } from "react";
import Link from "next/link";
import { resetPassword } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    const result = await resetPassword(email);
    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "Something went wrong.");
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <>
        <h1 className="text-[24px] leading-[1.3] font-semibold tracking-tight text-solid-text mb-2">
          Check your email
        </h1>
        <p className="text-[15px] text-solid-text-secondary mb-8">
          If an account exists for <strong>{email}</strong>, we&apos;ve sent a
          password reset link. Click the link to reset your password.
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
        Reset your password
      </h1>
      <p className="text-[15px] text-solid-text-secondary mb-8">
        Enter your email and we&apos;ll send you a reset link.
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
          {loading ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="mt-6 text-center text-[14px] text-solid-text-tertiary">
        Remember your password?{" "}
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
