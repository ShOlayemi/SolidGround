"use client";

import clsx from "clsx";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SpinnerIcon, CheckCircleIcon } from "@/components/icons";
import { joinWaitlist } from "@/app/actions";

type EmailCaptureFormProps = {
  variant?: "light" | "dark";
};

/**
 * EmailCaptureForm — evolved from WaitlistForm. Keeps validation,
 * spinner, and error handling. On success shows an inline confirmation
 * ("You're on the list.") rather than redirecting; the primary signup
 * path is the "Start your Blueprint" button.
 */
export function EmailCaptureForm({ variant = "dark" }: EmailCaptureFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "submitting" | "error" | "success"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  function validate(value: string): string | null {
    if (!value.trim()) return "Please enter your email address.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
      return "Please enter a valid email address.";
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const err = validate(email);
    if (err) {
      setErrorMessage(err);
      setStatus("error");
      return;
    }

    setStatus("submitting");
    setErrorMessage("");

    const result = await joinWaitlist(email);

    if (result.success) {
      setStatus("success");
    } else {
      setStatus("error");
      setErrorMessage(result.error ?? "Something went wrong. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-5 py-4 text-[15px] font-medium text-white">
        <CheckCircleIcon size={18} className="text-accent-400" />
        You&apos;re on the list.
      </div>
    );
  }

  const isDark = variant === "dark";

  return (
    <form onSubmit={handleSubmit} className="w-full text-left">
      <label
        htmlFor="email-capture"
        className={clsx(
          "mb-2 block text-[13px] font-medium",
          isDark ? "text-slate-300" : "text-slate-600",
        )}
      >
        Get product updates
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <Input
            id="email-capture"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status === "error") setStatus("idle");
            }}
            error={status === "error" ? errorMessage : undefined}
            disabled={status === "submitting"}
            variant={isDark ? "dark" : "light"}
            aria-label="Email address"
            className="w-full"
          />
        </div>
        <Button
          type="submit"
          variant={isDark ? "outlineDark" : "filled"}
          size="md"
          disabled={status === "submitting"}
          className="shrink-0 min-h-[52px]"
        >
          {status === "submitting" ? (
            <>
              <SpinnerIcon size={16} />
              Subscribing...
            </>
          ) : (
            "Subscribe"
          )}
        </Button>
      </div>
      {status === "error" && errorMessage && (
        <p
          className={clsx(
            "mt-2 text-[13px]",
            isDark ? "text-danger-400" : "text-danger-600",
          )}
          role="alert"
        >
          {errorMessage}
        </p>
      )}
    </form>
  );
}
