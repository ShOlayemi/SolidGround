"use client";

import { useEffect } from "react";
import { trackEvent, type AnalyticsEvents } from "@/lib/analytics/events";

export function AnalyticsPageView<K extends keyof AnalyticsEvents>({ name, properties }: { name: K; properties: AnalyticsEvents[K] }) {
  useEffect(() => { trackEvent(name, properties); }, [name, properties]);
  return null;
}
