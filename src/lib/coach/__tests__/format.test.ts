// ──────────────────────────────────────────────────────────────
// SolidGround AI — Coach Formatting Helper Tests
// ──────────────────────────────────────────────────────────────
// Exercises src/lib/coach/format.ts (relative timestamps, message
// times, date dividers) with a pinned clock.
// ──────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { formatDateDivider, formatMessageTime, formatRelativeTime } from "@/lib/coach/format";

const NOW = new Date("2026-08-02T12:00:00.000Z");

describe("formatRelativeTime", () => {
  it("returns 'Just now' for timestamps within the last minute", () => {
    expect(formatRelativeTime("2026-08-02T11:59:30.000Z", NOW)).toBe("Just now");
  });

  it("clamps future timestamps to 'Just now'", () => {
    expect(formatRelativeTime("2026-08-02T13:00:00.000Z", NOW)).toBe("Just now");
  });

  it("returns 'Xm ago' for recent minutes", () => {
    expect(formatRelativeTime("2026-08-02T11:55:00.000Z", NOW)).toBe("5m ago");
  });

  it("returns 'Xh ago' for recent hours", () => {
    expect(formatRelativeTime("2026-08-02T10:00:00.000Z", NOW)).toBe("2h ago");
  });

  it("returns 'Xd ago' for the past week", () => {
    expect(formatRelativeTime("2026-07-30T12:00:00.000Z", NOW)).toBe("3d ago");
  });

  it("falls back to a short date for older timestamps", () => {
    const label = formatRelativeTime("2026-06-01T12:00:00.000Z", NOW);
    expect(label).toMatch(/Jun 1/);
  });

  it("returns an empty string for invalid timestamps", () => {
    expect(formatRelativeTime("not-a-date", NOW)).toBe("");
  });
});

describe("formatMessageTime", () => {
  it("formats an ISO timestamp as a locale time", () => {
    const label = formatMessageTime("2026-08-02T11:05:00.000Z");
    expect(label).toMatch(/\d{1,2}:\d{2}/);
  });

  it("returns an empty string for invalid timestamps", () => {
    expect(formatMessageTime("nope")).toBe("");
  });
});

describe("formatDateDivider", () => {
  it("labels today", () => {
    expect(formatDateDivider("2026-08-02T09:00:00.000Z", NOW)).toBe("Today");
  });

  it("labels yesterday", () => {
    expect(formatDateDivider("2026-08-01T09:00:00.000Z", NOW)).toBe("Yesterday");
  });

  it("labels older dates with a weekday + short date", () => {
    const label = formatDateDivider("2026-07-30T09:00:00.000Z", NOW);
    expect(label).toMatch(/Thu/);
    expect(label).toMatch(/Jul 30/);
  });
});
