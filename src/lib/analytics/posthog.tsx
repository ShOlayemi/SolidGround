"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider as ReactPostHogProvider, usePostHog as useReactPostHog } from "posthog-js/react";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined" || !key || posthog.__loaded) return;
    posthog.init(key, {
      api_host: host,
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,
      session_recording: { maskAllInputs: true },
    });
  }, []);

  return <ReactPostHogProvider client={posthog}>{children}</ReactPostHogProvider>;
}

export function usePostHog() {
  return useReactPostHog();
}

export { posthog };
