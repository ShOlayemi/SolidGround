// ──────────────────────────────────────────────────────────────
// SolidGround AI — Coach Display Formatting Helpers
// ──────────────────────────────────────────────────────────────
// Pure, client-safe formatting for the coach UI: relative
// conversation timestamps, per-message times, and date dividers.
// No server-only imports — safe to import from client components.
//
// Granularity is deliberately calm and coarse, mirroring the mobile
// client ("Just now", "5m ago", "2h ago", "3d ago", then a short
// date). A timestamp ahead of `now` clamps to "Just now".
// ──────────────────────────────────────────────────────────────

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

function isSameDay(first: Date, second: Date): boolean {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function shortDate(timestamp: string, now: Date): string {
  return new Date(timestamp).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: new Date(timestamp).getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

/** "Just now" / "5m ago" / "2h ago" / "3d ago" / short date. */
export function formatRelativeTime(timestamp: string, now: Date = new Date()): string {
  const then = new Date(timestamp).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Math.max(0, now.getTime() - then);
  if (diff < MINUTE_MS) return "Just now";
  const minutes = Math.floor(diff / MINUTE_MS);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(diff / HOUR_MS);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(diff / DAY_MS);
  if (days < 7) return `${days}d ago`;
  return shortDate(timestamp, now);
}

/** "3:42 PM" style per-message time. */
export function formatMessageTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** "Today" / "Yesterday" / "Mon, Jul 3" date divider label. */
export function formatDateDivider(timestamp: string, now: Date = new Date()): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Earlier";
  if (isSameDay(date, now)) return "Today";

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return "Yesterday";

  return date.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}
