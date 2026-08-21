// ──────────────────────────────────────────────────────────────
// SolidGround AI — Trust & Safety server-action tests
// ──────────────────────────────────────────────────────────────
// Exercises src/lib/trust/actions.ts against the in-memory Supabase fake
// (src/lib/__tests__/helpers/supabaseMock.ts): block self-guard, block
// insert + graceful existing-block handling, unblock delete, blocked-list
// with display-name join, and report submission (validation + insert +
// reporter scoping).
// ──────────────────────────────────────────────────────────────
import { describe, it, expect, beforeEach } from "vitest";
import { mockSupabase } from "@/lib/__tests__/helpers/supabaseMock";
import {
  blockUser,
  unblockUser,
  listBlockedUsers,
  reportUser,
} from "@/lib/trust/actions";

const ME = "user-me";
const THEM = "user-them";

describe("trust actions · blocking", () => {
  beforeEach(() => mockSupabase.reset());

  it("refuses to block yourself", async () => {
    mockSupabase.setSession(ME);
    const result = await blockUser(ME);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/yourself/i);
  });

  it("blocks a user with the session as blocker", async () => {
    mockSupabase.setSession(ME);
    const result = await blockUser(THEM);
    expect(result).toEqual({ ok: true });
    const rows = mockSupabase.tables["blocked_users"] ?? [];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ blocker_user_id: ME, blocked_user_id: THEM });
  });

  it("handles an already-existing block gracefully", async () => {
    mockSupabase.setSession(ME);
    mockSupabase.seed("blocked_users", [
      { id: "block-1", blocker_user_id: ME, blocked_user_id: THEM },
    ]);
    const result = await blockUser(THEM);
    expect(result.ok).toBe(true);
  });

  it("requires a session to block", async () => {
    mockSupabase.clearSession();
    const result = await blockUser(THEM);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not authenticated/i);
  });

  it("unblocks a user by their block row id", async () => {
    mockSupabase.setSession(ME);
    mockSupabase.seed("blocked_users", [
      { id: "block-1", blocker_user_id: ME, blocked_user_id: THEM },
    ]);
    const result = await unblockUser("block-1");
    expect(result).toEqual({ ok: true });
    expect(mockSupabase.tables["blocked_users"] ?? []).toHaveLength(0);
  });

  it("lists my blocked users with their display names", async () => {
    mockSupabase.setSession(ME);
    mockSupabase.seed("blocked_users", [
      { id: "block-1", blocker_user_id: ME, blocked_user_id: THEM, created_at: "2026-01-02T00:00:00Z" },
    ]);
    mockSupabase.seed("profiles", [
      { id: THEM, display_name: "Alex", full_name: "Alex Partner" },
    ]);
    const list = await listBlockedUsers();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: "block-1", blockedUserId: THEM, displayName: "Alex" });
  });

  it("does not list another user's blocks", async () => {
    mockSupabase.setSession(ME);
    mockSupabase.seed("blocked_users", [
      { id: "block-other", blocker_user_id: "someone-else", blocked_user_id: THEM },
    ]);
    const list = await listBlockedUsers();
    expect(list).toHaveLength(0);
  });
});

describe("trust actions · reporting", () => {
  beforeEach(() => mockSupabase.reset());

  it("rejects an unknown report reason", async () => {
    mockSupabase.setSession(ME);
    const result = await reportUser({
      reportedUserId: THEM,
      reason: "not-a-reason" as never,
    });
    expect(result.ok).toBe(false);
  });

  it("submits a report scoped to the session user", async () => {
    mockSupabase.setSession(ME);
    const result = await reportUser({
      reportedUserId: THEM,
      reason: "harassment",
      details: "Repeated unwanted messages.",
    });
    expect(result.ok).toBe(true);
    const rows = mockSupabase.tables["reports"] ?? [];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      reporter_user_id: ME,
      reported_user_id: THEM,
      category: "harassment",
      description: "Repeated unwanted messages.",
    });
  });

  it("caps the report description length", async () => {
    mockSupabase.setSession(ME);
    const result = await reportUser({
      reportedUserId: THEM,
      reason: "other",
      details: "x".repeat(2001),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/characters/i);
  });

  it("requires a session to report", async () => {
    mockSupabase.clearSession();
    const result = await reportUser({ reportedUserId: THEM, reason: "other" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not authenticated/i);
  });
});
