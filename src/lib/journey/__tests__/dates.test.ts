// ──────────────────────────────────────────────────────────────
// SolidGround AI — Journey Date Helper Tests
// ──────────────────────────────────────────────────────────────
// Light unit tests for the pure date helpers in src/lib/journey/dates.ts
// (target-date parsing + display formatting). Mirrors the mobile
// lib/journey/dates tests.
// ──────────────────────────────────────────────────────────────
import { describe, it, expect } from "vitest";
import { formatGoalDate, goalDateInputValue, parseGoalDate } from "@/lib/journey/dates";

describe("parseGoalDate", () => {
  it("parses a plain YYYY-MM-DD into an ISO UTC-midnight timestamp", () => {
    const result = parseGoalDate("2026-12-31");
    expect(result).toEqual({ valid: true, iso: "2026-12-31T00:00:00.000Z" });
  });

  it("treats an empty string as 'no target date'", () => {
    expect(parseGoalDate("")).toEqual({ valid: true, iso: null });
    expect(parseGoalDate("   ")).toEqual({ valid: true, iso: null });
  });

  it("rejects malformed and impossible dates", () => {
    expect(parseGoalDate("31-12-2026")).toEqual({ valid: false, iso: null });
    expect(parseGoalDate("2026-13-01")).toEqual({ valid: false, iso: null });
    expect(parseGoalDate("2026-02-31")).toEqual({ valid: false, iso: null });
    expect(parseGoalDate("yesterday")).toEqual({ valid: false, iso: null });
  });
});

describe("goalDateInputValue", () => {
  it("slices an ISO timestamp to YYYY-MM-DD", () => {
    expect(goalDateInputValue("2026-12-31T00:00:00.000Z")).toBe("2026-12-31");
    expect(goalDateInputValue(null)).toBe("");
    expect(goalDateInputValue(undefined)).toBe("");
  });
});

describe("formatGoalDate", () => {
  it("renders a short display label", () => {
    expect(formatGoalDate("2026-09-01T00:00:00.000Z")).toBe("Sep 1, 2026");
  });
  it("falls back to the raw value for unparseable dates", () => {
    expect(formatGoalDate("not-a-date")).toBe("not-a-date");
  });
});
