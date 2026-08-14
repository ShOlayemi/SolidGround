import { describe, it, expect, beforeEach } from "vitest";
import { mockSupabase } from "@/lib/__tests__/helpers/supabaseMock";
import {
  sendConnectionRequest,
  getConnectionRequests,
  respondToConnectionRequest,
  cancelConnectionRequest,
} from "@/lib/connections/actions";
import { makeBlueprintResults } from "@/lib/__tests__/helpers/blueprintFixture";
import type { AssessmentCategory } from "@/types";

const USER_A = "user-a";
const USER_B = "user-b";
const REQUEST_ID = "request-1";

function seedBlueprint(userId: string, sessionId: string, scores: Partial<Record<AssessmentCategory, number>> = {}): void {
  const results = makeBlueprintResults(userId, sessionId, scores);
  mockSupabase.seed("assessment_sessions", [{
    id: sessionId,
    user_id: userId,
    status: "completed",
    completed_at: "2026-08-01T10:00:00.000Z",
  }]);
  mockSupabase.seed("blueprint_results", [{
    session_id: sessionId,
    user_id: userId,
    category_results: results.categoryResults,
    overall_score: results.overallScore,
    overall_confidence: results.overallConfidence,
    created_at: "2026-08-01T10:00:00.000Z",
    updated_at: "2026-08-01T10:00:00.000Z",
  }]);
}

function seedRequest(status: "pending" | "accepted" | "declined" = "pending", relationshipType = "romantic"): void {
  mockSupabase.seed("connection_requests", [{
    id: REQUEST_ID,
    from_user_id: USER_A,
    to_user_id: USER_B,
    status,
    relationship_type: relationshipType,
    created_at: "2026-08-01T10:00:00.000Z",
    updated_at: "2026-08-01T10:00:00.000Z",
  }]);
}

function seedBlock(blockerUserId: string, blockedUserId: string): void {
  mockSupabase.seed("blocked_users", [{ blocker_user_id: blockerUserId, blocked_user_id: blockedUserId }]);
}

describe("connection actions", () => {
  beforeEach(() => mockSupabase.reset());

  it("sendConnectionRequest creates a pending request", async () => {
    mockSupabase.setSession(USER_A);
    const result = await sendConnectionRequest(USER_B);

    expect(result.success).toBe(true);
    expect(mockSupabase.tables.connection_requests).toHaveLength(1);
    expect(mockSupabase.tables.connection_requests[0]).toMatchObject({
      from_user_id: USER_A,
      to_user_id: USER_B,
      status: "pending",
    });
  });

  it("sendConnectionRequest stores relationship_type", async () => {
    mockSupabase.setSession(USER_A);
    const result = await sendConnectionRequest(USER_B, "platonic");

    expect(result.success).toBe(true);
    expect(mockSupabase.tables.connection_requests[0]).toMatchObject({
      from_user_id: USER_A,
      to_user_id: USER_B,
      relationship_type: "platonic",
    });
  });

  it("sendConnectionRequest refuses when the recipient has blocked the sender", async () => {
    mockSupabase.setSession(USER_A);
    seedBlock(USER_B, USER_A); // B blocked A

    const result = await sendConnectionRequest(USER_B);

    expect(result).toEqual({ success: false, error: "This user is no longer available." });
    expect(mockSupabase.tables.connection_requests ?? []).toHaveLength(0);
  });

  it("sendConnectionRequest refuses when the sender has blocked the recipient", async () => {
    mockSupabase.setSession(USER_A);
    seedBlock(USER_A, USER_B); // A blocked B

    const result = await sendConnectionRequest(USER_B);

    expect(result).toEqual({ success: false, error: "This user is no longer available." });
    expect(mockSupabase.tables.connection_requests ?? []).toHaveLength(0);
  });

  it("sendConnectionRequest fails closed when the block check errors", async () => {
    mockSupabase.setSession(USER_A);
    mockSupabase.failTable("blocked_users", "db exploded");

    const result = await sendConnectionRequest(USER_B);

    expect(result).toEqual({ success: false, error: "Could not send request." });
    expect(mockSupabase.tables.connection_requests ?? []).toHaveLength(0);
  });

  it("getConnectionRequests returns incoming requests", async () => {
    mockSupabase.setSession(USER_B);
    seedRequest();
    mockSupabase.seed("profiles", [
      { id: USER_A, display_name: "Alex", full_name: "Alex A" },
      { id: USER_B, display_name: "Blair", full_name: "Blair B" },
    ]);

    const result = await getConnectionRequests();

    expect(result.success).toBe(true);
    expect(result.incoming).toHaveLength(1);
    expect(result.incoming[0]).toMatchObject({ id: REQUEST_ID, from_user_id: USER_A, from_name: "Alex" });
    expect(result.unreadCount).toBe(1);
  });

  it("respondToConnectionRequest refuses when the recipient has blocked the sender", async () => {
    mockSupabase.setSession(USER_B);
    seedRequest();
    seedBlock(USER_B, USER_A); // B (recipient/responder) blocked A (sender)

    const result = await respondToConnectionRequest(REQUEST_ID, true);

    expect(result).toEqual({ success: false, error: "This request is no longer available." });
    expect(mockSupabase.tables.connection_requests[0].status).toBe("pending");
    expect(mockSupabase.tables.pairings ?? []).toHaveLength(0);
  });

  it("respondToConnectionRequest refuses when the sender has blocked the recipient", async () => {
    mockSupabase.setSession(USER_B);
    seedRequest();
    seedBlock(USER_A, USER_B); // A (sender) blocked B (recipient/responder)

    const result = await respondToConnectionRequest(REQUEST_ID, true);

    expect(result).toEqual({ success: false, error: "This request is no longer available." });
    expect(mockSupabase.tables.connection_requests[0].status).toBe("pending");
    expect(mockSupabase.tables.pairings ?? []).toHaveLength(0);
  });

  it("respondToConnectionRequest fails closed when the block check errors", async () => {
    mockSupabase.setSession(USER_B);
    seedRequest();
    mockSupabase.failTable("blocked_users", "db exploded");

    const result = await respondToConnectionRequest(REQUEST_ID, true);

    expect(result).toEqual({ success: false, error: "Could not update request." });
    expect(mockSupabase.tables.connection_requests[0].status).toBe("pending");
    expect(mockSupabase.tables.pairings ?? []).toHaveLength(0);
  });

  it("respondToConnectionRequest with accept creates pairing and updates status", async () => {
    mockSupabase.setSession(USER_B);
    seedRequest();
    seedBlueprint(USER_A, "session-a", { core_values: 80 });
    seedBlueprint(USER_B, "session-b", { core_values: 70 });

    const result = await respondToConnectionRequest(REQUEST_ID, true);

    expect(result.success).toBe(true);
    expect(result.pairingId).toBeTruthy();
    expect(mockSupabase.tables.connection_requests[0].status).toBe("accepted");
    expect(mockSupabase.tables.pairings).toHaveLength(1);
    expect(mockSupabase.tables.pairings[0]).toMatchObject({
      inviter_user_id: USER_A,
      invitee_user_id: USER_B,
      status: "completed",
      relationship_type: "romantic",
    });
    expect(mockSupabase.tables.comparison_reports).toHaveLength(1);
  });

  it("respondToConnectionRequest passes through relationship_type to pairing", async () => {
    mockSupabase.setSession(USER_B);
    seedRequest("pending", "platonic");
    seedBlueprint(USER_A, "session-a", { core_values: 80 });
    seedBlueprint(USER_B, "session-b", { core_values: 70 });

    const result = await respondToConnectionRequest(REQUEST_ID, true);

    expect(result.success).toBe(true);
    expect(mockSupabase.tables.pairings[0]).toMatchObject({
      relationship_type: "platonic",
    });
  });

  it("respondToConnectionRequest with decline updates status", async () => {
    mockSupabase.setSession(USER_B);
    seedRequest();

    const result = await respondToConnectionRequest(REQUEST_ID, false);

    expect(result.success).toBe(true);
    expect(mockSupabase.tables.connection_requests[0].status).toBe("declined");
    expect(mockSupabase.tables.pairings ?? []).toHaveLength(0);
  });

  it("cancelConnectionRequest deletes the request", async () => {
    mockSupabase.setSession(USER_A);
    seedRequest();

    const result = await cancelConnectionRequest(REQUEST_ID);

    expect(result.success).toBe(true);
    expect(mockSupabase.tables.connection_requests ?? []).toHaveLength(0);
  });
});
