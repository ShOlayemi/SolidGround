// ──────────────────────────────────────────────────────────────
// SolidGround AI — Journey Topic-Sync Planner Tests
// ──────────────────────────────────────────────────────────────
// Exercises the pure planTopicSync() logic (src/lib/journey/sync.ts):
// the insert/update/delete plan that ensureTopicsFromReport executes.
// The critical regression here is the UPDATE-BY-ID-NOT-UPSERT rule:
// existing rows whose (category_id, topic) still matches the CURRENT
// report must be refreshed with ONLY category_name + prompts — status
// ("Discussed") and created_by must NOT be part of the update payload,
// because an upsert on the UNIQUE(pairing_id, category_id, topic)
// constraint would evaluate the table's INSERT policy
// (WITH CHECK: created_by = auth.uid()) against a payload with
// created_by = NULL and fail with 42501 (the mobile live bug).
// ──────────────────────────────────────────────────────────────
import { describe, it, expect } from "vitest";
import { planTopicSync, topicKey } from "@/lib/journey/sync";
import type { RelationshipTopicRow } from "@/lib/journey/types";
import type { ConversationGuide } from "@/types";

const PAIRING = "pairing-1";

function guide(
  categoryId: string,
  categoryName: string,
  topic: string,
  prompts: string[] = ["Prompt 1"],
): ConversationGuide {
  return { categoryId, categoryName, topic, prompts };
}

function row(
  id: string,
  categoryId: string,
  topic: string,
  status: RelationshipTopicRow["status"] = "not_started",
  categoryName = "Old Name",
  createdBy = "user-a",
): RelationshipTopicRow {
  return {
    id,
    pairing_id: PAIRING,
    category_id: categoryId,
    category_name: categoryName,
    topic,
    prompts: [],
    status,
    created_by: createdBy,
    created_at: "2026-08-01T10:00:00.000Z",
    updated_at: "2026-08-01T10:00:00.000Z",
  };
}

describe("planTopicSync", () => {
  it("plans inserts for guides with no existing row — status 'not_started', pairing scoped", () => {
    const plan = planTopicSync(PAIRING, [], [guide("money", "Money & Finances", "Budgeting together")]);

    expect(plan.toInsert).toEqual([
      {
        pairing_id: PAIRING,
        category_id: "money",
        category_name: "Money & Finances",
        topic: "Budgeting together",
        prompts: ["Prompt 1"],
        status: "not_started",
      },
    ]);
    expect(plan.toUpdate).toEqual([]);
    expect(plan.toDelete).toEqual([]);
  });

  it("plans UPDATE-by-id for matching rows with ONLY category_name + prompts (the 42501 guard)", () => {
    const existing = [row("topic-1", "money", "Budgeting together", "discussed", "Old Name", "user-b")];
    const plan = planTopicSync(PAIRING, existing, [
      guide("money", "Money & Finances", "Budgeting together", ["New prompt"]),
    ]);

    expect(plan.toInsert).toEqual([]);
    // The update payload must carry ONLY id/category_name/prompts — never
    // status or created_by (an upsert carrying created_by = NULL would
    // violate the INSERT policy WITH CHECK and fail with 42501).
    expect(plan.toUpdate).toEqual([
      {
        id: "topic-1",
        category_name: "Money & Finances",
        prompts: ["New prompt"],
      },
    ]);
    expect(plan.toUpdate[0]).not.toHaveProperty("status");
    expect(plan.toUpdate[0]).not.toHaveProperty("created_by");
    expect(plan.toDelete).toEqual([]);
  });

  it("computes stale rows for deletion but the service never runs them (no DELETE policy)", () => {
    const existing = [
      row("topic-1", "money", "Budgeting together"),
      row("topic-2", "communication", "Listening styles"),
    ];
    const plan = planTopicSync(PAIRING, existing, [guide("money", "Money & Finances", "Budgeting together")]);

    expect(plan.toUpdate.map((u) => u.id)).toEqual(["topic-1"]);
    expect(plan.toDelete).toEqual(["topic-2"]);
  });

  it("collapses duplicate guide keys — first occurrence wins", () => {
    const plan = planTopicSync(PAIRING, [], [
      guide("money", "Money & Finances", "Budgeting together", ["First"]),
      guide("money", "Money & Finances", "Budgeting together", ["Second"]),
    ]);

    expect(plan.toInsert).toHaveLength(1);
    expect(plan.toInsert[0].prompts).toEqual(["First"]);
  });

  it("skips unusable guides defensively", () => {
    const plan = planTopicSync(PAIRING, [], [
      guide("money", "Money & Finances", "Budgeting together"),
      { categoryId: "", categoryName: "No id", topic: "x", prompts: [] },
      { categoryId: "x", categoryName: "No topic", topic: "", prompts: [] },
    ] as ConversationGuide[]);

    expect(plan.toInsert).toHaveLength(1);
    expect(plan.toInsert[0].topic).toBe("Budgeting together");
  });

  it("topicKey is stable per (category_id, topic)", () => {
    expect(topicKey("money", "Budgeting")).toBe(topicKey("money", "Budgeting"));
    expect(topicKey("money", "Budgeting")).not.toBe(topicKey("money", "budgeting"));
  });
});
