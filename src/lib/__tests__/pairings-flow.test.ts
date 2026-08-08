// ──────────────────────────────────────────────────────────────
// SolidGround AI — Pairings Flow Integration Tests
// ──────────────────────────────────────────────────────────────
// Exercises the real server-action orchestration in
// src/lib/pairings/actions.ts (create invite → accept invite →
// generate comparison report → retrieve report) against an
// in-memory Supabase fake. Only the data layer is faked; all
// validation, authorization and report-generation logic is real.
// ──────────────────────────────────────────────────────────────
// NOTE: import the mock helper first so its vi.mock registration
// happens before the actions modules are loaded.
import { describe, it, expect, beforeEach } from "vitest";
import { mockSupabase } from "./helpers/supabaseMock";
import {
  createInvite,
  acceptInvite,
  getMyPairings,
  getComparisonReport,
  saveComparisonReport,
  refreshReport,
} from "@/lib/pairings/actions";
import { makeBlueprintResults } from "./helpers/blueprintFixture";
import type { AssessmentCategory } from "@/types";
import type { BlueprintResults } from "@/lib/scoring/types";

// ── Helpers ───────────────────────────────────────────────────

function seedCompletedSession(
  userId: string,
  sessionId: string,
  completedAt = "2026-08-01T10:00:00.000Z",
): void {
  mockSupabase.seed("assessment_sessions", [
    {
      id: sessionId,
      user_id: userId,
      status: "completed",
      completed_at: completedAt,
    },
  ]);
}

function seedBlueprint(
  userId: string,
  sessionId: string,
  scores: Partial<Record<AssessmentCategory, number>> = {},
): BlueprintResults {
  const results = makeBlueprintResults(userId, sessionId, scores);
  mockSupabase.seed("blueprint_results", [
    {
      session_id: sessionId,
      user_id: userId,
      category_results: results.categoryResults,
      overall_score: results.overallScore,
      overall_confidence: results.overallConfidence,
      created_at: "2026-08-01T10:00:00.000Z",
      updated_at: "2026-08-01T10:00:00.000Z",
    },
  ]);
  return results;
}

const USER_A = "user-a";
const USER_B = "user-b";
const SESSION_A = "session-a";
const SESSION_B = "session-b";

describe("pairings flow", () => {
  beforeEach(() => {
    mockSupabase.reset();
  });

  it("creates a pending invite from a completed session", async () => {
    mockSupabase.setSession(USER_A);
    seedCompletedSession(USER_A, SESSION_A);
    seedBlueprint(USER_A, SESSION_A, { core_values: 80 });

    const result = await createInvite(SESSION_A);

    expect(result.success).toBe(true);
    expect(result.inviteCode).toBeTruthy();
    expect(result.pairingId).toBeTruthy();

    const pairings = mockSupabase.tables["pairings"] ?? [];
    expect(pairings).toHaveLength(1);
    expect(pairings[0]).toMatchObject({
      inviter_user_id: USER_A,
      inviter_session_id: SESSION_A,
      status: "pending",
      invite_code: result.inviteCode,
    });
  });

  it("rejects invite creation when the session is not completed", async () => {
    mockSupabase.setSession(USER_A);
    mockSupabase.seed("assessment_sessions", [
      { id: SESSION_A, user_id: USER_A, status: "in_progress" },
    ]);
    seedBlueprint(USER_A, SESSION_A);

    const result = await createInvite(SESSION_A);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Complete your assessment");
  });

  it("rejects invite creation when the session belongs to another user", async () => {
    mockSupabase.setSession(USER_A);
    seedCompletedSession(USER_B, SESSION_A); // session owned by someone else

    const result = await createInvite(SESSION_A);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authorized.");
  });

  it("rejects invite creation when unauthenticated", async () => {
    mockSupabase.clearSession();
    const result = await createInvite(SESSION_A);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated.");
  });

  it("accepts an invite, computes alignment and saves a comparison report", async () => {
    // Inviter creates the invite
    mockSupabase.setSession(USER_A);
    seedCompletedSession(USER_A, SESSION_A);
    seedBlueprint(USER_A, SESSION_A, { core_values: 80, children: 30 });
    const invite = await createInvite(SESSION_A);
    expect(invite.success).toBe(true);
    const inviteCode = invite.inviteCode!;

    // Invitee accepts
    mockSupabase.setSession(USER_B);
    seedCompletedSession(USER_B, SESSION_B);
    seedBlueprint(USER_B, SESSION_B, { core_values: 70, children: 85 });

    const accept = await acceptInvite(inviteCode);
    expect(accept.success).toBe(true);
    const pairingId = accept.pairingId!;

    // Pairing row updated
    const pairing = (mockSupabase.tables["pairings"] ?? []).find(
      (p) => p.id === pairingId,
    )!;
    expect(pairing.status).toBe("completed");
    expect(pairing.invitee_user_id).toBe(USER_B);
    expect(pairing.invitee_session_id).toBe(SESSION_B);
    expect(pairing.alignment_results).toBeTruthy();

    // Comparison report persisted
    const reports = mockSupabase.tables["comparison_reports"] ?? [];
    expect(reports).toHaveLength(1);
    expect(reports[0].pairing_id).toBe(pairingId);
    expect(reports[0].overall_compatibility).toBeGreaterThanOrEqual(0);
    expect(reports[0].category_comparisons).toHaveLength(12);
    expect((reports[0] as Record<string, unknown>).potential_conflicts as unknown[]).toHaveLength(1); // children conflict 30 vs 85

    // Inviter notified via RPC (cross-user notification)
    const notificationCall = mockSupabase.rpcCalls.find(
      (c) => c.fn === "create_notification_for_user",
    );
    expect(notificationCall).toBeTruthy();
    expect(notificationCall!.args.target_user_id).toBe(USER_A);
    expect(notificationCall!.args.notification_type).toBe("invite_accepted");

    // Report retrievable
    const fetched = await getComparisonReport(pairingId);
    expect(fetched.success).toBe(true);
    expect(fetched.report?.pairingId).toBe(pairingId);
    expect(fetched.report?.categoryComparisons).toHaveLength(12);
    expect(fetched.report?.dealBreakerIntersections).toHaveLength(0); // no deal-breakers triggered in test data
  });

  it("regenerates the report via saveComparisonReport and refreshReport", async () => {
    mockSupabase.setSession(USER_A);
    seedCompletedSession(USER_A, SESSION_A);
    seedBlueprint(USER_A, SESSION_A);
    const invite = await createInvite(SESSION_A);

    mockSupabase.setSession(USER_B);
    seedCompletedSession(USER_B, SESSION_B);
    seedBlueprint(USER_B, SESSION_B, { money: 20 });
    await acceptInvite(invite.inviteCode!);

    const pairingId = (mockSupabase.tables["pairings"] ?? [])[0].id as string;

    const saved = await saveComparisonReport(pairingId);
    expect(saved.success).toBe(true);

    const refreshed = await refreshReport(pairingId);
    expect(refreshed.success).toBe(true);

    // Upsert keeps a single row
    expect(mockSupabase.tables["comparison_reports"]).toHaveLength(1);
  });

  it("refreshReport uses each partner's latest completed session, not the pinned one", async () => {
    // Inviter creates the invite from an older session (pinned in the pairing)
    mockSupabase.setSession(USER_A);
    seedCompletedSession(USER_A, SESSION_A);
    seedBlueprint(USER_A, SESSION_A, { core_values: 80 });
    const invite = await createInvite(SESSION_A);

    // Invitee accepts with their session
    mockSupabase.setSession(USER_B);
    seedCompletedSession(USER_B, SESSION_B);
    seedBlueprint(USER_B, SESSION_B, { core_values: 70 });
    await acceptInvite(invite.inviteCode!);

    const pairingId = (mockSupabase.tables["pairings"] ?? [])[0].id as string;

    // Inviter retakes the assessment → newer completed session with different results
    const SESSION_A2 = "session-a2";
    seedCompletedSession(USER_A, SESSION_A2, "2026-08-02T10:00:00.000Z");
    seedBlueprint(USER_A, SESSION_A2, { core_values: 20 });

    const refreshed = await refreshReport(pairingId);
    expect(refreshed.success).toBe(true);

    const fetched = await getComparisonReport(pairingId);
    expect(fetched.success).toBe(true);
    const coreValues = fetched.report?.categoryComparisons.find(
      (c) => c.categoryId === "core_values",
    );
    // New session (20) is used, not the pinned session (80)
    expect(coreValues?.inviterScore).toBe(20);
    expect(coreValues?.inviteeScore).toBe(70);
  });

  it("refreshReport falls back to the pinned session when no completed session exists", async () => {
    mockSupabase.setSession(USER_A);
    seedCompletedSession(USER_A, SESSION_A);
    seedBlueprint(USER_A, SESSION_A, { core_values: 80 });
    const invite = await createInvite(SESSION_A);

    mockSupabase.setSession(USER_B);
    seedCompletedSession(USER_B, SESSION_B);
    seedBlueprint(USER_B, SESSION_B, { core_values: 70 });
    await acceptInvite(invite.inviteCode!);

    const pairingId = (mockSupabase.tables["pairings"] ?? [])[0].id as string;

    // Simulate the inviter's session no longer being completed (e.g. status changed)
    mockSupabase.tables["assessment_sessions"] = (
      mockSupabase.tables["assessment_sessions"] ?? []
    )
      .filter((s) => !(s.user_id === USER_A && s.status === "completed"))
      .map((s) => (s.user_id === USER_A ? { ...s, status: "in_progress" } : s));

    const refreshed = await refreshReport(pairingId);
    expect(refreshed.success).toBe(true);

    // Report still generated from the pinned session's results
    const fetched = await getComparisonReport(pairingId);
    expect(fetched.success).toBe(true);
    const coreValues = fetched.report?.categoryComparisons.find(
      (c) => c.categoryId === "core_values",
    );
    expect(coreValues?.inviterScore).toBe(80);
  });

  it("rejects accepting your own invite", async () => {
    mockSupabase.setSession(USER_A);
    seedCompletedSession(USER_A, SESSION_A);
    seedBlueprint(USER_A, SESSION_A);
    const invite = await createInvite(SESSION_A);

    const result = await acceptInvite(invite.inviteCode!);
    expect(result.success).toBe(false);
    expect(result.error).toBe("You cannot accept your own invite.");
  });

  it("rejects accepting an already-completed invite", async () => {
    mockSupabase.setSession(USER_A);
    seedCompletedSession(USER_A, SESSION_A);
    seedBlueprint(USER_A, SESSION_A);
    const invite = await createInvite(SESSION_A);

    mockSupabase.setSession(USER_B);
    seedCompletedSession(USER_B, SESSION_B);
    seedBlueprint(USER_B, SESSION_B);
    await acceptInvite(invite.inviteCode!);
    expect(mockSupabase.tables["pairings"]?.[0]?.status).toBe("completed");

    const second = await acceptInvite(invite.inviteCode!);
    expect(second.success).toBe(false);
    expect(second.error).toBe("This invite is no longer available.");
  });

  it("requires the invitee to have a completed session with results", async () => {
    mockSupabase.setSession(USER_A);
    seedCompletedSession(USER_A, SESSION_A);
    seedBlueprint(USER_A, SESSION_A);
    const invite = await createInvite(SESSION_A);

    mockSupabase.setSession(USER_B);
    seedCompletedSession(USER_B, SESSION_B);
    // No blueprint_results for user-b

    const result = await acceptInvite(invite.inviteCode!);
    expect(result.success).toBe(false);
    expect(result.error).toContain("results are not ready");
  });

  it("lists pairings for a user in both roles", async () => {
    mockSupabase.setSession(USER_A);
    seedCompletedSession(USER_A, SESSION_A);
    seedBlueprint(USER_A, SESSION_A);
    const invite = await createInvite(SESSION_A);

    mockSupabase.setSession(USER_B);
    seedCompletedSession(USER_B, SESSION_B);
    seedBlueprint(USER_B, SESSION_B);
    await acceptInvite(invite.inviteCode!);

    mockSupabase.setSession(USER_B);
    const mine = await getMyPairings();
    expect(mine.success).toBe(true);
    expect(mine.pairings).toHaveLength(1);
    expect(mine.pairings![0].invitee_user_id).toBe(USER_B);
    expect(mine.pairings![0].inviter_user_id).toBe(USER_A);
    expect(mine.pairings![0].status).toBe("completed");
  });
});
