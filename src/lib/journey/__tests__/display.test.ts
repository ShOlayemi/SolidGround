// ──────────────────────────────────────────────────────────────
// SolidGround AI — Journey Display Helper Tests
// ──────────────────────────────────────────────────────────────
// Light unit tests for the pure UI helpers in src/lib/journey/display.ts
// (status grouping + derived "remaining" count). The data layer itself is
// already covered by actions.test.ts / sync.test.ts.
// ──────────────────────────────────────────────────────────────
import { describe, it, expect } from "vitest";
import {
  AGREEMENT_STATUS_LABEL,
  AGREEMENT_STATUS_ORDER,
  GOAL_STATUS_LABEL,
  GOAL_STATUS_ORDER,
  domainLabel,
  groupTopicsByStatus,
  topicsRemaining,
} from "@/lib/journey/display";
import type { JourneyTopic } from "@/lib/journey/types";

function topic(overrides: Partial<JourneyTopic> & { id: string; topic: string }): JourneyTopic {
  return {
    categoryId: "values",
    categoryName: "Values",
    prompts: ["Prompt one."],
    status: "not_started",
    ...overrides,
  };
}

describe("topicsRemaining", () => {
  it("subtracts discussed from total, never negative", () => {
    expect(topicsRemaining({ topicsTotal: 10, topicsDiscussed: 3, goalsActive: 0, goalsCompleted: 0 })).toBe(7);
    expect(topicsRemaining({ topicsTotal: 3, topicsDiscussed: 5, goalsActive: 0, goalsCompleted: 0 })).toBe(0);
    expect(topicsRemaining({ topicsTotal: 0, topicsDiscussed: 0, goalsActive: 0, goalsCompleted: 0 })).toBe(0);
  });
});

describe("groupTopicsByStatus", () => {
  it("groups discussed vs not-started, preserving report order within each group", () => {
    const topics: JourneyTopic[] = [
      topic({ id: "a", topic: "Alpha" }),
      topic({ id: "b", topic: "Beta", status: "discussed" }),
      topic({ id: "c", topic: "Gamma" }),
      topic({ id: "d", topic: "Delta", status: "discussed" }),
    ];
    const { notStarted, discussed } = groupTopicsByStatus(topics);
    expect(notStarted.map((t) => t.id)).toEqual(["a", "c"]);
    expect(discussed.map((t) => t.id)).toEqual(["b", "d"]);
  });

  it("returns empty arrays for no topics", () => {
    const { notStarted, discussed } = groupTopicsByStatus([]);
    expect(notStarted).toEqual([]);
    expect(discussed).toEqual([]);
  });
});

describe("goal status vocabulary", () => {
  it("labels every goal status in display order", () => {
    expect(GOAL_STATUS_ORDER).toEqual(["not_started", "in_progress", "completed"]);
    expect(GOAL_STATUS_ORDER.map((s) => GOAL_STATUS_LABEL[s])).toEqual([
      "Not started",
      "In progress",
      "Completed",
    ]);
  });
});

describe("agreement status vocabulary", () => {
  it("labels every agreement status in display order", () => {
    expect(AGREEMENT_STATUS_ORDER).toEqual(["pending", "agreed"]);
    expect(AGREEMENT_STATUS_ORDER.map((s) => AGREEMENT_STATUS_LABEL[s])).toEqual([
      "Pending",
      "Agreed",
    ]);
  });
});

describe("domainLabel", () => {
  it("maps a category id to its canonical label", () => {
    expect(domainLabel("money")).toBe("Money & Finances");
    expect(domainLabel("communication")).toBe("Communication");
  });
  it("returns null for null / unknown domains", () => {
    expect(domainLabel(null)).toBeNull();
    expect(domainLabel(undefined)).toBeNull();
    expect(domainLabel("not-a-category")).toBeNull();
  });
});
