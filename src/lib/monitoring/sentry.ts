/**
 * Sentry integration seam. When SENTRY_DSN is configured, replace these
 * fallbacks with @sentry/nextjs captureException/captureMessage calls and
 * initialize Sentry in SentryInit.
 */
export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (process.env.SENTRY_DSN) {
    // TODO: captureException(error, { extra: context }) from @sentry/nextjs.
    return;
  }
  console.error("[Sentry disabled]", error, context ?? "");
}

export function captureMessage(message: string, level: "info" | "warning" | "error" = "info"): void {
  if (process.env.SENTRY_DSN) {
    // TODO: captureMessage(message, level) from @sentry/nextjs.
    return;
  }
  (level === "error" ? console.error : console.warn)("[Sentry disabled]", message);
}
