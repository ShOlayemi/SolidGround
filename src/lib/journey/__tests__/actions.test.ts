// ──────────────────────────────────────────────────────────────
// SolidGround AI — Journey Data-Layer Server Action Tests
// ──────────────────────────────────────────────────────────────
// Exercises src/lib/journey/actions.ts against the in-memory Supabase
// fake (src/lib/__tests__/helpers/supabaseMock.ts): active-pairing
// resolution, ensureTopicsFromReport (INSERT new / UPDATE-by-id refresh /
// status + created_by preservation / no DELETE of stale rows), owner and
// participant scoping (reflections filtered by user_id; topics/goals/
// agreements scoped by pairing_id), and the full goal / agreement /
// reflection CRUD surface.
// ──────────────────────────────────────────────────────────────
import { describe, it, expect, beforeEach } from "vitest";
import { mockSupabase } from "@/lib/__tests__/helpers/supabaseMock";
import type { ConversationGuide } from "@/types";
import {
  createAgreement,
  createGoal,
  createReflection,
  deleteAgreement,
  deleteGoal,
  deleteReflection,
  ensureTopicsFromReport,
  getJourneyCounts,
  getJourneyDashboard,
  getTopic,
  listAgreements,
  listGoals,
  listReflections,
  listTopics,
  setAgreementStatus,
  setTopicStatus,
  updateAgreement,
  updateGoal,
  updateReflection,
} from "@/lib/journey/actions";

const USER_A = "user-a";
const USER_B = "user-b";
const PAIRING = "pairing-1";

// ── Seed helpers ──────────────────────────────────────────────

function seedPairing(
  id: string,
  inviter: string,
  invitee: string,
  status = "active",
  updatedAt = "2026-08-01T10:00:00.000Z",
): void {
  mockSupabase.seed("pairings", [
    {
      id,
      inviter_user_id: inviter,
      invitee_user_id: invitee,
      status,
      created_at: "2026-08-01T09:00:00.000Z",
      updated_at: updatedAt,
    },
  ]);
}

function seedReport(pairingId: string, guides: ConversationGuide[]): void {
  mockSupabase.seed("comparison_reports", [
    { pairing_id: pairingId, conversation_guides: guides, generated_at: "2026-08-02T10:00:00.000Z" },
  ]);
}

const GUIDES: ConversationGuide[] = [
  { categoryId: "money", categoryName: "Money & Finances", topic: "Budgeting together", prompts: ["How do you split expenses?"] },
  { categoryId: "communication", categoryName: "Communication", topic: "Listening styles", prompts: ["How do you recharge after conflict?"] },
];

function seedTopic(
  id: string,
  pairingId: string,
  categoryId: string,
  topic: string,
  status: "not_started" | "discussed" = "not_started",
  createdBy = USER_A,
  categoryName = "Old Name",
): void {
  mockSupabase.seed("relationship_topics", [
    {
      id,
      pairing_id: pairingId,
      category_id: categoryId,
      category_name: categoryName,
      topic,
      prompts: [],
      status,
      created_by: createdBy,
      created_at: "2026-08-01T10:00:00.000Z",
      updated_at: "2026-08-01T10:00:00.000Z",
    },
  ]);
}

function seedGoal(
  id: string,
  pairingId: string,
  title: string,
  status: "not_started" | "in_progress" | "completed" = "not_started",
  createdBy = USER_A,
  createdAt = "2026-08-01T10:00:00.000Z",
): void {
  mockSupabase.seed("shared_goals", [
    {
      id,
      pairing_id: pairingId,
      created_by: createdBy,
      title,
      description: null,
      domain: null,
      target_date: null,
      status,
      created_at: createdAt,
      updated_at: createdAt,
    },
  ]);
}

function seedAgreement(
  id: string,
  pairingId: string,
  title: string,
  status: "pending" | "agreed" = "pending",
  createdBy = USER_A,
  createdAt = "2026-08-01T10:00:00.000Z",
): void {
  mockSupabase.seed("shared_agreements", [
    {
      id,
      pairing_id: pairingId,
      created_by: createdBy,
      title,
      description: null,
      domain: null,
      status,
      created_at: createdAt,
      updated_at: createdAt,
    },
  ]);
}

function seedReflection(id: string, userId: string, content: string): void {
  mockSupabase.seed("private_reflections", [
    {
      id,
      user_id: userId,
      pairing_id: PAIRING,
      topic_id: null,
      category_id: null,
      content,
      created_at: "2026-08-01T10:00:00.000Z",
      updated_at: "2026-08-01T10:00:00.000Z",
    },
  ]);
}

// ── getJourneyDashboard ───────────────────────────────────────

describe("getJourneyDashboard", () => {
  beforeEach(() => mockSupabase.reset());

  it("requires authentication", async () => {
    const result = await getJourneyDashboard();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Not authenticated.");
  });

  it("returns the { hasPairing: false } sentinel when the user has no active pairing", async () => {
    mockSupabase.setSession(USER_A);
    seedPairing("pairing-other", USER_B, "someone-else", "pending");

    const result = await getJourneyDashboard();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual({ hasPairing: false });
  });

  it("resolves the most recent accepted/active/completed pairing (pending ignored)", async () => {
    mockSupabase.setSession(USER_A);
    seedPairing("pairing-old", USER_A, USER_B, "completed", "2026-07-01T10:00:00.000Z");
    seedPairing("pairing-pending", USER_A, "someone-else", "pending", "2026-08-05T10:00:00.000Z");
    seedPairing(PAIRING, USER_A, USER_B, "accepted", "2026-08-03T10:00:00.000Z");
    seedReport(PAIRING, GUIDES);

    const result = await getJourneyDashboard();
    expect(result.ok).toBe(true);
    if (result.ok && result.data.hasPairing) {
      expect(result.data.pairingId).toBe(PAIRING);
    } else {
      throw new Error("expected a pairing");
    }
  });

  it("materializes topics from the latest report and returns the full aggregate", async () => {
    mockSupabase.setSession(USER_A);
    seedPairing(PAIRING, USER_A, USER_B, "active");
    seedReport(PAIRING, GUIDES);
    seedGoal("goal-1", PAIRING, "Save for a trip", "in_progress", USER_A, "2026-07-01T10:00:00.000Z");
    seedGoal("goal-2", PAIRING, "Visit both families", "completed", USER_A, "2026-08-01T10:00:00.000Z");
    seedAgreement("agree-1", PAIRING, "No phones at dinner", "agreed");
    seedReflection("refl-1", USER_A, "We handle money talks better now");

    const result = await getJourneyDashboard();
    expect(result.ok).toBe(true);
    if (!result.ok || !result.data.hasPairing) throw new Error("expected dashboard data");
    const data = result.data;

    expect(data.pairingId).toBe(PAIRING);
    // Topics materialized in report order, status 'not_started', created by the session user.
    expect(data.topics).toHaveLength(2);
    expect(data.topics[0]).toMatchObject({
      id: expect.any(String),
      categoryId: "money",
      categoryName: "Money & Finances",
      topic: "Budgeting together",
      prompts: ["How do you split expenses?"],
      status: "not_started",
    });
    const stored = mockSupabase.tables["relationship_topics"] ?? [];
    expect(stored.every((t) => t.created_by === USER_A)).toBe(true);

    expect(data.goals.map((g) => g.id)).toEqual(["goal-2", "goal-1"]); // newest first
    expect(data.agreements.map((a) => a.id)).toEqual(["agree-1"]);
    expect(data.reflections.map((r) => r.id)).toEqual(["refl-1"]);

    // Counts: topicsTotal = report guides length; goalsActive = not completed.
    expect(data.counts).toEqual({
      topicsTotal: 2,
      topicsDiscussed: 0,
      goalsActive: 1,
      goalsCompleted: 1,
    });
  });

  it("survives a pairing with no report yet (empty topics, zero counts)", async () => {
    mockSupabase.setSession(USER_A);
    seedPairing(PAIRING, USER_A, USER_B, "accepted");

    const result = await getJourneyDashboard();
    expect(result.ok).toBe(true);
    if (!result.ok || !result.data.hasPairing) throw new Error("expected dashboard data");
    expect(result.data.topics).toEqual([]);
    expect(result.data.counts.topicsTotal).toBe(0);
  });
});

// ── ensureTopicsFromReport ────────────────────────────────────

describe("ensureTopicsFromReport", () => {
  beforeEach(() => mockSupabase.reset());

  it("requires authentication", async () => {
    const result = await ensureTopicsFromReport(PAIRING);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Not authenticated.");
  });

  it("inserts missing topics with status 'not_started' and created_by = session user", async () => {
    mockSupabase.setSession(USER_A);
    seedReport(PAIRING, GUIDES);

    const result = await ensureTopicsFromReport(PAIRING);
    expect(result.ok).toBe(true);

    const stored = mockSupabase.tables["relationship_topics"] ?? [];
    expect(stored).toHaveLength(2);
    expect(stored[0]).toMatchObject({
      pairing_id: PAIRING,
      category_id: "money",
      category_name: "Money & Finances",
      topic: "Budgeting together",
      status: "not_started",
      created_by: USER_A,
    });
  });

  it("refreshes EXISTING topics by UPDATE-by-id: category_name + prompts only — 'discussed' status and created_by survive", async () => {
    mockSupabase.setSession(USER_A);
    seedReport(PAIRING, GUIDES);
    // The topic already exists (created by the PARTNER — created_by must
    // never be rewritten), was already marked discussed, and has stale text.
    seedTopic("topic-1", PAIRING, "money", "Budgeting together", "discussed", USER_B, "Stale Name");
    // A second topic that the report no longer contains (stale).
    seedTopic("topic-stale", PAIRING, "career", "Old career topic", "discussed", USER_A);

    const result = await ensureTopicsFromReport(PAIRING);
    expect(result.ok).toBe(true);

    const stored = mockSupabase.tables["relationship_topics"] ?? [];
    expect(stored).toHaveLength(3); // 1 refreshed + 1 inserted + 1 stale (NOT deleted)

    const refreshed = stored.find((t) => t.id === "topic-1");
    expect(refreshed).toMatchObject({
      category_name: "Money & Finances", // refreshed
      prompts: ["How do you split expenses?"], // refreshed
      status: "discussed", // SURVIVES the refresh
      created_by: USER_B, // SURVIVES the refresh (never rewritten)
    });

    const inserted = stored.find((t) => t.id !== "topic-1" && t.id !== "topic-stale");
    expect(inserted).toMatchObject({
      category_id: "communication",
      topic: "Listening styles",
      status: "not_started",
      created_by: USER_A,
    });

    // Stale rows are NOT deleted (migration 035 has no DELETE policy).
    expect(stored.some((t) => t.id === "topic-stale")).toBe(true);
  });

  it("is a no-op when the pairing has no report", async () => {
    mockSupabase.setSession(USER_A);

    const result = await ensureTopicsFromReport(PAIRING);
    expect(result.ok).toBe(true);
    expect(mockSupabase.tables["relationship_topics"] ?? []).toHaveLength(0);
  });
});

// ── listTopics / getTopic / setTopicStatus ────────────────────

describe("listTopics / getTopic / setTopicStatus", () => {
  beforeEach(() => mockSupabase.reset());

  it("listTopics returns only that pairing's topics, in created_at order", async () => {
    mockSupabase.setSession(USER_A);
    seedTopic("topic-1", PAIRING, "money", "Budgeting together");
    seedTopic("topic-2", "pairing-other", "money", "Someone else's topic");
    seedTopic("topic-3", PAIRING, "communication", "Listening styles");

    const result = await listTopics(PAIRING);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.map((t) => t.id)).toEqual(["topic-1", "topic-3"]);
      expect(result.data[0]).toMatchObject({ categoryId: "money", status: "not_started" });
    }
  });

  it("getTopic returns null for a missing topic", async () => {
    mockSupabase.setSession(USER_A);
    const result = await getTopic("does-not-exist");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBeNull();
  });

  it("getTopic returns the topic for a participant", async () => {
    mockSupabase.setSession(USER_B);
    seedTopic("topic-1", PAIRING, "money", "Budgeting together", "discussed");

    const result = await getTopic("topic-1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toMatchObject({ id: "topic-1", categoryId: "money", status: "discussed" });
    }
  });

  it("setTopicStatus marks a topic discussed and rejects invalid statuses", async () => {
    mockSupabase.setSession(USER_A);
    seedTopic("topic-1", PAIRING, "money", "Budgeting together");

    const bad = await setTopicStatus("topic-1", "reviewed" as never);
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toBe("Invalid topic status.");

    const good = await setTopicStatus("topic-1", "discussed");
    expect(good.ok).toBe(true);
    expect(mockSupabase.tables["relationship_topics"]![0].status).toBe("discussed");
  });

  it("setTopicStatus requires authentication", async () => {
    const result = await setTopicStatus("topic-1", "discussed");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Not authenticated.");
  });
});

// ── Goals CRUD ────────────────────────────────────────────────

describe("goals", () => {
  beforeEach(() => mockSupabase.reset());

  it("createGoal requires a title and sets created_by from the session", async () => {
    mockSupabase.setSession(USER_A);
    const empty = await createGoal({ pairingId: PAIRING, title: "   " });
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.error).toBe("Give your goal a title.");

    const created = await createGoal({
      pairingId: PAIRING,
      title: "  Save for a trip  ",
      description: "A beach week",
      domain: "money",
      targetDate: "2026-12-31T00:00:00.000Z",
    });
    expect(created.ok).toBe(true);
    if (created.ok) {
      expect(created.data).toMatchObject({
        pairingId: PAIRING,
        createdBy: USER_A,
        title: "Save for a trip", // trimmed
        description: "A beach week",
        domain: "money",
        targetDate: "2026-12-31T00:00:00.000Z",
        status: "not_started",
      });
    }
  });

  it("listGoals is pairing-scoped, newest first", async () => {
    mockSupabase.setSession(USER_A);
    seedGoal("goal-1", PAIRING, "Older", "in_progress", USER_A, "2026-07-01T10:00:00.000Z");
    seedGoal("goal-2", PAIRING, "Newer", "not_started", USER_A, "2026-08-01T10:00:00.000Z");
    seedGoal("goal-other", "pairing-other", "Other pairing's goal", "not_started");

    const result = await listGoals(PAIRING);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.map((g) => g.id)).toEqual(["goal-2", "goal-1"]);
  });

  it("updateGoal applies a partial patch and leaves other fields unchanged", async () => {
    mockSupabase.setSession(USER_A);
    seedGoal("goal-1", PAIRING, "Save for a trip", "not_started");

    const result = await updateGoal("goal-1", { title: "Save for a honeymoon", status: "in_progress" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toMatchObject({
        id: "goal-1",
        title: "Save for a honeymoon",
        status: "in_progress",
        description: null,
        domain: null,
        targetDate: null,
      });
    }
  });

  it("updateGoal rejects an empty title and reports not found for missing ids", async () => {
    mockSupabase.setSession(USER_A);
    seedGoal("goal-1", PAIRING, "Save for a trip", "not_started");

    const badTitle = await updateGoal("goal-1", { title: " " });
    expect(badTitle.ok).toBe(false);

    const missing = await updateGoal("does-not-exist", { title: "X" });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.error).toBe("Goal not found.");
  });

  it("deleteGoal removes the row", async () => {
    mockSupabase.setSession(USER_A);
    seedGoal("goal-1", PAIRING, "Save for a trip", "not_started");

    const result = await deleteGoal("goal-1");
    expect(result.ok).toBe(true);
    expect(mockSupabase.tables["shared_goals"] ?? []).toHaveLength(0);
  });

  it("requires authentication", async () => {
    const result = await createGoal({ pairingId: PAIRING, title: "X" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Not authenticated.");
  });
});

// ── Agreements CRUD ───────────────────────────────────────────

describe("agreements", () => {
  beforeEach(() => mockSupabase.reset());

  it("createAgreement starts 'pending' and records the session user as creator", async () => {
    mockSupabase.setSession(USER_A);
    const created = await createAgreement({ pairingId: PAIRING, title: "No phones at dinner", domain: "communication" });
    expect(created.ok).toBe(true);
    if (created.ok) {
      expect(created.data).toMatchObject({
        pairingId: PAIRING,
        createdBy: USER_A,
        title: "No phones at dinner",
        domain: "communication",
        status: "pending",
      });
    }
  });

  it("listAgreements is pairing-scoped", async () => {
    mockSupabase.setSession(USER_A);
    seedAgreement("agree-1", PAIRING, "No phones at dinner", "agreed");
    seedAgreement("agree-other", "pairing-other", "Other pairing's agreement", "pending");

    const result = await listAgreements(PAIRING);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.map((a) => a.id)).toEqual(["agree-1"]);
  });

  it("setAgreementStatus moves pending → agreed and rejects invalid statuses", async () => {
    mockSupabase.setSession(USER_A);
    seedAgreement("agree-1", PAIRING, "No phones at dinner", "pending");

    const bad = await setAgreementStatus("agree-1", "ratified" as never);
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toBe("Invalid agreement status.");

    const good = await setAgreementStatus("agree-1", "agreed");
    expect(good.ok).toBe(true);
    if (good.ok) expect(good.data.status).toBe("agreed");

    const missing = await setAgreementStatus("does-not-exist", "agreed");
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.error).toBe("Agreement not found.");
  });

  it("updateAgreement patches title/description/domain only", async () => {
    mockSupabase.setSession(USER_A);
    seedAgreement("agree-1", PAIRING, "No phones at dinner", "pending");

    const result = await updateAgreement("agree-1", { title: "No screens at dinner", description: "Both of us" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toMatchObject({
        id: "agree-1",
        title: "No screens at dinner",
        description: "Both of us",
        status: "pending", // unchanged
      });
    }
  });

  it("deleteAgreement removes the row", async () => {
    mockSupabase.setSession(USER_A);
    seedAgreement("agree-1", PAIRING, "No phones at dinner", "pending");

    const result = await deleteAgreement("agree-1");
    expect(result.ok).toBe(true);
    expect(mockSupabase.tables["shared_agreements"] ?? []).toHaveLength(0);
  });
});

// ── Reflections (owner-only) ──────────────────────────────────

describe("reflections", () => {
  beforeEach(() => mockSupabase.reset());

  it("listReflections returns only the session user's own reflections", async () => {
    mockSupabase.setSession(USER_A);
    seedReflection("refl-1", USER_A, "My note");
    seedReflection("refl-2", USER_B, "Partner's private note");

    const result = await listReflections();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.map((r) => r.id)).toEqual(["refl-1"]);
    }
  });

  it("createReflection requires content and sets user_id from the session (never the caller)", async () => {
    mockSupabase.setSession(USER_A);
    const empty = await createReflection({ content: "   " });
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.error).toBe("Write something before saving your reflection.");

    const created = await createReflection({
      pairingId: PAIRING,
      topicId: "topic-1",
      categoryId: "money",
      content: "  We handled that talk well  ",
    });
    expect(created.ok).toBe(true);
    if (created.ok) {
      expect(created.data).toMatchObject({
        pairingId: PAIRING,
        topicId: "topic-1",
        categoryId: "money",
        content: "We handled that talk well", // trimmed
      });
    }
    const stored = mockSupabase.tables["private_reflections"] ?? [];
    expect(stored[0]).toMatchObject({ user_id: USER_A, pairing_id: PAIRING, topic_id: "topic-1" });
  });

  it("updateReflection is owner-scoped — a partner's reflection is not found and unchanged", async () => {
    mockSupabase.setSession(USER_A);
    seedReflection("refl-b", USER_B, "Partner's note");

    const result = await updateReflection("refl-b", { content: "Hijacked" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Reflection not found.");
    expect(mockSupabase.tables["private_reflections"]![0].content).toBe("Partner's note");
  });

  it("updateReflection updates the owner's own reflection", async () => {
    mockSupabase.setSession(USER_A);
    seedReflection("refl-1", USER_A, "Original");

    const result = await updateReflection("refl-1", { content: "Updated" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.content).toBe("Updated");
  });

  it("deleteReflection is owner-scoped — a partner's reflection is never deleted", async () => {
    mockSupabase.setSession(USER_A);
    seedReflection("refl-1", USER_A, "Mine");
    seedReflection("refl-b", USER_B, "Partner's note");

    // The owner-scoped filter (.eq user_id = session user) matches no rows
    // for the partner's reflection — the delete is a safe no-op and the
    // partner's row survives (RLS is the real boundary in production).
    const partnerRow = await deleteReflection("refl-b");
    expect(partnerRow.ok).toBe(true);
    expect(mockSupabase.tables["private_reflections"] ?? []).toHaveLength(2);

    const ownRow = await deleteReflection("refl-1");
    expect(ownRow.ok).toBe(true);
    expect(mockSupabase.tables["private_reflections"] ?? []).toHaveLength(1);
  });

  it("enforces the reflection length cap", async () => {
    mockSupabase.setSession(USER_A);
    const result = await createReflection({ content: "x".repeat(2001) });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Reflections are limited to 2000 characters.");
  });
});

// ── getJourneyCounts ──────────────────────────────────────────

describe("getJourneyCounts", () => {
  beforeEach(() => mockSupabase.reset());

  it("returns real persisted counts from the report, topic statuses, and goals", async () => {
    mockSupabase.setSession(USER_A);
    seedReport(PAIRING, GUIDES);
    seedTopic("topic-1", PAIRING, "money", "Budgeting together", "discussed");
    seedGoal("goal-1", PAIRING, "In progress", "in_progress");
    seedGoal("goal-2", PAIRING, "Not started", "not_started");
    seedGoal("goal-3", PAIRING, "Done", "completed");

    const result = await getJourneyCounts(PAIRING);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({
        topicsTotal: 2, // report guides length
        topicsDiscussed: 1,
        goalsActive: 2,
        goalsCompleted: 1,
      });
    }
  });

  it("requires authentication", async () => {
    const result = await getJourneyCounts(PAIRING);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Not authenticated.");
  });
});
