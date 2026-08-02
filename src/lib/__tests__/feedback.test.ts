// ──────────────────────────────────────────────────────────────
// SolidGround AI — Feedback Integration Tests
// ──────────────────────────────────────────────────────────────
// Exercises src/lib/feedback/actions.ts against the in-memory
// Supabase fake: submission + validation, user history, NPS
// eligibility, and the admin moderation path (role-gated).
// ──────────────────────────────────────────────────────────────
import { describe, it, expect, beforeEach } from "vitest";
import { mockSupabase } from "./helpers/supabaseMock";
import {
  submitFeedback,
  getMyFeedback,
  getNPSEligibility,
  getAllFeedback,
} from "@/lib/feedback/actions";

const USER_A = "user-a";
const USER_B = "user-b";
const ADMIN = "admin-1";

describe("feedback", () => {
  beforeEach(() => {
    mockSupabase.reset();
  });

  it("submits feedback with the user's email attached server-side", async () => {
    mockSupabase.setSession(USER_A, "alice@example.com");

    const result = await submitFeedback(
      USER_A,
      "bug",
      "Scoring bug",
      "Overall score looked wrong.",
      4,
    );

    expect(result.success).toBe(true);
    expect(result.feedback?.id).toBeTruthy();
    expect(result.feedback?.type).toBe("bug");
    expect(result.feedback?.rating).toBe(4);
    expect(result.feedback?.status).toBe("new");

    const rows = mockSupabase.tables["feedback"] ?? [];
    expect(rows).toHaveLength(1);
    expect(rows[0].metadata).toMatchObject({ user_email: "alice@example.com" });
  });

  it("validates that a title or description is required", async () => {
    mockSupabase.setSession(USER_A);
    const result = await submitFeedback(USER_A, "general", "   ", "  ");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Please add a title or a description.");
  });

  it("validates rating range", async () => {
    mockSupabase.setSession(USER_A);
    const result = await submitFeedback(USER_A, "nps", "NPS", "Great", 11);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Rating must be a whole number");
  });

  it("rejects unknown feedback types", async () => {
    mockSupabase.setSession(USER_A);
    const result = await submitFeedback(
      USER_A,
      "invalid-type" as "bug",
      "T",
      "D",
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid feedback type.");
  });

  it("rejects submitting on behalf of another user", async () => {
    mockSupabase.setSession(USER_A);
    const result = await submitFeedback(USER_B, "general", "T", "D");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authorized.");
  });

  it("requires authentication", async () => {
    mockSupabase.clearSession();
    const result = await submitFeedback(null, "general", "T", "D");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated.");
  });

  it("returns only the current user's feedback history", async () => {
    mockSupabase.setSession(USER_A);
    mockSupabase.seed("feedback", [
      {
        id: "f1",
        user_id: USER_A,
        type: "bug",
        rating: null,
        title: "My bug",
        description: "d",
        metadata: null,
        status: "new",
        created_at: "2026-08-01T10:00:00.000Z",
      },
      {
        id: "f2",
        user_id: USER_B,
        type: "general",
        rating: null,
        title: "Other's",
        description: "d",
        metadata: null,
        status: "new",
        created_at: "2026-08-01T11:00:00.000Z",
      },
    ]);

    const result = await getMyFeedback(USER_A);
    expect(result.success).toBe(true);
    expect(result.feedback).toHaveLength(1);
    expect(result.feedback[0].id).toBe("f1");
  });

  it("grants NPS eligibility only when the user has no NPS response", async () => {
    mockSupabase.setSession(USER_A);

    const first = await getNPSEligibility(USER_A);
    expect(first.success).toBe(true);
    expect(first.eligible).toBe(true);

    await submitFeedback(USER_A, "nps", "NPS", "9/10", 9);

    const second = await getNPSEligibility(USER_A);
    expect(second.eligible).toBe(false);
  });

  it("lets an admin list all feedback with pagination", async () => {
    mockSupabase.setSession(ADMIN, "admin@example.com");
    mockSupabase.seed("profiles", [{ id: ADMIN, role: "admin" }]);
    mockSupabase.seed("feedback", [
      {
        id: "f1",
        user_id: USER_A,
        type: "bug",
        rating: 3,
        title: "Bug A",
        description: "d",
        metadata: null,
        status: "new",
        created_at: "2026-08-01T10:00:00.000Z",
      },
      {
        id: "f2",
        user_id: USER_B,
        type: "feature",
        rating: null,
        title: "Feature B",
        description: "d",
        metadata: null,
        status: "new",
        created_at: "2026-08-01T11:00:00.000Z",
      },
    ]);

    const result = await getAllFeedback(0, 10);
    expect(result.success).toBe(true);
    expect(result.page?.total).toBe(2);
    expect(result.page?.items).toHaveLength(2);
    expect(result.page?.pageSize).toBe(10);
  });

  it("blocks non-admin users from listing all feedback", async () => {
    mockSupabase.setSession(USER_A);
    mockSupabase.seed("profiles", [{ id: USER_A, role: "user" }]);

    const result = await getAllFeedback();
    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authorized.");
  });
});
