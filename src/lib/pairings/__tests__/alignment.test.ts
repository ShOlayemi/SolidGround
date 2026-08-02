// ──────────────────────────────────────────────────────────────
// SolidGround AI — Alignment Engine Unit Tests
// ──────────────────────────────────────────────────────────────
// Covers the pure analyzers in src/lib/pairings/alignment.ts:
// analyzeConflicts, generateConversationGuides,
// findGrowthOpportunities, findDealBreakerIntersections,
// computeAlignment, and the generateComparisonReport orchestrator.
// ──────────────────────────────────────────────────────────────
import { describe, it, expect } from "vitest";
import type { CategoryAlignment } from "@/types";
import {
  analyzeConflicts,
  generateConversationGuides,
  findGrowthOpportunities,
  findDealBreakerIntersections,
  computeAlignment,
  generateComparisonReport,
} from "../alignment";
import {
  makeBlueprintResults,
  makeBlueprintWithDealBreaker,
} from "@/lib/__tests__/helpers/blueprintFixture";
import { CATEGORY_LABELS } from "@/lib/assessment/questions";

// ── Helpers ───────────────────────────────────────────────────

function makeCategoryAlignment(
  categoryId: string,
  inviterScore: number,
  inviteeScore: number,
): CategoryAlignment {
  return {
    categoryId,
    categoryName: CATEGORY_LABELS[categoryId as keyof typeof CATEGORY_LABELS] ?? categoryId,
    inviterScore,
    inviteeScore,
    alignment: Math.max(0, 100 - Math.abs(inviterScore - inviteeScore)),
    sharedStrengths: [],
    divergentAreas: [],
  };
}

// ── analyzeConflicts ──────────────────────────────────────────

describe("analyzeConflicts", () => {
  it("skips categories with a score difference below 25", () => {
    const alignments = [
      makeCategoryAlignment("core_values", 70, 80), // diff 10
      makeCategoryAlignment("communication", 60, 65), // diff 5
    ];
    expect(analyzeConflicts(alignments, makeBlueprintResults("a", "s1"), makeBlueprintResults("b", "s2"))).toEqual([]);
  });

  it("flags a conflict when the difference is ≥ 25", () => {
    const alignments = [makeCategoryAlignment("money", 90, 30)];
    const conflicts = analyzeConflicts(alignments, makeBlueprintResults("a", "s1"), makeBlueprintResults("b", "s2"));
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].categoryId).toBe("money");
    expect(conflicts[0].severity).toBe("high"); // diff 60 ≥ 50
    expect(conflicts[0].type).toBe("vision_difference");
    expect(conflicts[0].description).toContain("money & finances");
  });

  it("classifies severity by difference size", () => {
    const alignments = [
      makeCategoryAlignment("core_values", 100, 60), // diff 40 → medium
      makeCategoryAlignment("lifestyle", 70, 45), // diff 25 → low
    ];
    const conflicts = analyzeConflicts(alignments, makeBlueprintResults("a", "s1"), makeBlueprintResults("b", "s2"));
    const byCategory = new Map(conflicts.map((c) => [c.categoryId, c.severity]));
    expect(byCategory.get("core_values")).toBe("medium");
    expect(byCategory.get("lifestyle")).toBe("low");
  });

  it("classifies conflict type per category map", () => {
    const alignments = [
      makeCategoryAlignment("core_values", 90, 40), // value_clash
      makeCategoryAlignment("communication", 90, 40), // communication_mismatch
      makeCategoryAlignment("social_life", 90, 40), // lifestyle_gap
      makeCategoryAlignment("career", 90, 40), // vision_difference
    ];
    const conflicts = analyzeConflicts(alignments, makeBlueprintResults("a", "s1"), makeBlueprintResults("b", "s2"));
    const byCategory = new Map(conflicts.map((c) => [c.categoryId, c.type]));
    expect(byCategory.get("core_values")).toBe("value_clash");
    expect(byCategory.get("communication")).toBe("communication_mismatch");
    expect(byCategory.get("social_life")).toBe("lifestyle_gap");
    expect(byCategory.get("career")).toBe("vision_difference");
  });

  it("reports both partners' stances", () => {
    const conflicts = analyzeConflicts(
      [makeCategoryAlignment("family", 85, 35)],
      makeBlueprintResults("a", "s1"),
      makeBlueprintResults("b", "s2"),
    );
    expect(conflicts[0].inviterStance).toContain("85");
    expect(conflicts[0].inviteeStance).toContain("35");
  });
});

// ── generateConversationGuides ────────────────────────────────

describe("generateConversationGuides", () => {
  it("creates one guide per conflict with a topic", () => {
    const conflicts = [
      {
        categoryId: "core_values",
        categoryName: "Core Values",
        severity: "high" as const,
        type: "value_clash" as const,
        description: "d",
        inviterStance: "s",
        inviteeStance: "s",
      },
      {
        categoryId: "money",
        categoryName: "Money & Finances",
        severity: "medium" as const,
        type: "vision_difference" as const,
        description: "d",
        inviterStance: "s",
        inviteeStance: "s",
      },
    ];
    const guides = generateConversationGuides(conflicts);
    expect(guides).toHaveLength(2);
    expect(guides[0].topic).toContain("Core Values");
    expect(guides[1].topic).toContain("Money");
  });

  it("uses the prompt bank keyed by category + conflict type", () => {
    const conflicts = [
      {
        categoryId: "communication",
        categoryName: "Communication",
        severity: "high" as const,
        type: "communication_mismatch" as const,
        description: "d",
        inviterStance: "s",
        inviteeStance: "s",
      },
    ];
    const [guide] = generateConversationGuides(conflicts);
    expect(guide.prompts.length).toBeGreaterThan(0);
    expect(guide.prompts[0]).toContain("heard"); // bank prompt for communication
  });

  it("falls back to generic prompts for unknown combinations", () => {
    const conflicts = [
      {
        categoryId: "core_values",
        categoryName: "Core Values",
        severity: "high" as const,
        type: "lifestyle_gap" as const, // not in the bank for core_values
        description: "d",
        inviterStance: "s",
        inviteeStance: "s",
      },
    ];
    const [guide] = generateConversationGuides(conflicts);
    expect(guide.prompts.length).toBe(4); // FALLBACK_PROMPTS
    expect(guide.prompts[0]).toContain("matters most");
  });
});

// ── findGrowthOpportunities ───────────────────────────────────

describe("findGrowthOpportunities", () => {
  it("flags 'shared' growth when both partners score ≤ 40", () => {
    const inviter = makeBlueprintResults("a", "s1", { communication: 35 });
    const invitee = makeBlueprintResults("b", "s2", { communication: 30 });
    const ops = findGrowthOpportunities(inviter, invitee);
    const comm = ops.find((o) => o.categoryId === "communication");
    expect(comm?.type).toBe("shared");
    expect(comm?.inviterScore).toBe(35);
    expect(comm?.inviteeScore).toBe(30);
  });

  it("flags 'complementary' growth when one partner is strong and the other is not", () => {
    const inviter = makeBlueprintResults("a", "s1", { money: 85 });
    const invitee = makeBlueprintResults("b", "s2", { money: 25 });
    const ops = findGrowthOpportunities(inviter, invitee);
    const money = ops.find((o) => o.categoryId === "money");
    expect(money?.type).toBe("complementary");
  });

  it("flags nothing when both partners are mid-range", () => {
    const inviter = makeBlueprintResults("a", "s1", { core_values: 60, money: 55 });
    const invitee = makeBlueprintResults("b", "s2", { core_values: 65, money: 50 });
    expect(findGrowthOpportunities(inviter, invitee)).toEqual([]);
  });
});

// ── findDealBreakerIntersections ──────────────────────────────

describe("findDealBreakerIntersections", () => {
  it("reports bothTriggered when both partners hit a deal-breaker", () => {
    const inviter = makeBlueprintWithDealBreaker("a", "s1", "children");
    const invitee = makeBlueprintWithDealBreaker("b", "s2", "children");
    const intersections = findDealBreakerIntersections(inviter, invitee);
    const children = intersections.find((i) => i.categoryId === "children")!;
    expect(children.bothTriggered).toBe(true);
    expect(children.inviterTriggered).toBe(true);
    expect(children.inviteeTriggered).toBe(true);
  });

  it("reports one-sided triggers separately", () => {
    const inviter = makeBlueprintWithDealBreaker("a", "s1", "family");
    const invitee = makeBlueprintResults("b", "s2", { family: 70 });
    const intersections = findDealBreakerIntersections(inviter, invitee);
    const family = intersections.find((i) => i.categoryId === "family")!;
    expect(family.inviterTriggered).toBe(true);
    expect(family.inviteeTriggered).toBe(false);
    expect(family.bothTriggered).toBe(false);
  });

  it("covers all 12 categories", () => {
    const intersections = findDealBreakerIntersections(
      makeBlueprintResults("a", "s1"),
      makeBlueprintResults("b", "s2"),
    );
    expect(intersections).toHaveLength(12);
  });
});

// ── computeAlignment ──────────────────────────────────────────

describe("computeAlignment", () => {
  it("aligns identical scores to 100 per category", () => {
    const inviter = makeBlueprintResults("a", "s1", { core_values: 80, money: 60 });
    const invitee = makeBlueprintResults("b", "s2", { core_values: 80, money: 60 });
    const result = computeAlignment(inviter, invitee);
    const cv = result.categoryAlignments.find((c) => c.categoryId === "core_values")!;
    expect(cv.alignment).toBe(100);
    expect(result.overallAlignment).toBe(100);
  });

  it("penalizes large differences", () => {
    const inviter = makeBlueprintResults("a", "s1", { lifestyle: 95 });
    const invitee = makeBlueprintResults("b", "s2", { lifestyle: 15 });
    const result = computeAlignment(inviter, invitee);
    const ls = result.categoryAlignments.find((c) => c.categoryId === "lifestyle")!;
    expect(ls.alignment).toBe(20); // 100 - 80
    expect(result.overallAlignment).toBeLessThan(100);
  });

  it("identifies shared strengths and divergent areas per question", () => {
    const inviter = makeBlueprintResults("a", "s1", {
      core_values: 90,
    });
    inviter.categoryResults[0].questionScores = { q1: 80, q2: 100, q3: 20 };
    const invitee = makeBlueprintResults("b", "s2", {
      core_values: 90,
    });
    invitee.categoryResults[0].questionScores = { q1: 90, q2: 30, q3: 10 };
    const result = computeAlignment(inviter, invitee);
    const cv = result.categoryAlignments.find((c) => c.categoryId === "core_values")!;
    expect(cv.sharedStrengths).toContain("q1"); // both ≥ 75
    expect(cv.divergentAreas).toContain("q2"); // 100 vs 30
    expect(cv.divergentAreas).not.toContain("q3"); // 20 vs 10 — neither side ≥ 75
  });
});

// ── generateComparisonReport ──────────────────────────────────

describe("generateComparisonReport", () => {
  it("assembles a complete report from both blueprints", () => {
    const inviter = makeBlueprintWithDealBreaker("a", "s1", "children", 30);
    const invitee = makeBlueprintResults("b", "s2", { children: 85, money: 20 });
    const report = generateComparisonReport("pairing_1", inviter, invitee);

    expect(report.pairingId).toBe("pairing_1");
    expect(report.overallCompatibility).toBeGreaterThanOrEqual(0);
    expect(report.categoryComparisons).toHaveLength(12);
    expect(report.sharedStrengths).toBeInstanceOf(Array);
    expect(report.potentialConflicts.length).toBeGreaterThan(0); // children 30 vs 85
    expect(report.conversationGuides).toHaveLength(report.potentialConflicts.length);
    // children 30 vs 85 → complementary growth opportunity
    expect(report.growthOpportunities.length).toBeGreaterThan(0);
    const childrenIntersection = report.dealBreakerIntersections.find(
      (i) => i.categoryId === "children",
    )!;
    expect(childrenIntersection.bothTriggered).toBe(false);
    expect(childrenIntersection.inviterTriggered).toBe(true);
    expect(childrenIntersection.inviteeTriggered).toBe(false);
  });
});
