import posthog from "posthog-js";

export type AnalyticsEvents = {
  signup: { method: "email" };
  login: { method: "email" };
  assessment_started: { category_count: number };
  assessment_completed: { score: number; categories_completed: number };
  report_viewed: { report_type: "blueprint" | "comparison" };
  upgrade_clicked: { from_tier: string; to_tier: string };
  subscription_purchased: { plan: string; amount: number };
  partner_invite_sent: Record<string, never>;
  partner_invite_accepted: Record<string, never>;
};

export function trackEvent<K extends keyof AnalyticsEvents>(name: K, properties?: AnalyticsEvents[K]): void {
  if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.capture(name, properties ?? {});
  }
}
