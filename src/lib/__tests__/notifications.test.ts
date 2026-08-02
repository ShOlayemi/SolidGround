// ──────────────────────────────────────────────────────────────
// SolidGround AI — Notifications Integration Tests
// ──────────────────────────────────────────────────────────────
// Exercises src/lib/notifications/actions.ts against the
// in-memory Supabase fake: creation (self + cross-user via RPC),
// retrieval with unread counts, read state updates, and
// preference-driven suppression.
// ──────────────────────────────────────────────────────────────
import { describe, it, expect, beforeEach } from "vitest";
import { mockSupabase } from "./helpers/supabaseMock";
import {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  getNotificationPreferences,
} from "@/lib/notifications/actions";

const USER_A = "user-a";
const USER_B = "user-b";

describe("notifications", () => {
  beforeEach(() => {
    mockSupabase.reset();
  });

  it("creates a notification for the current user", async () => {
    mockSupabase.setSession(USER_A);

    const result = await createNotification(
      USER_A,
      "assessment_complete",
      "Blueprint ready",
      "Your Compatibility Blueprint is ready.",
    );

    expect(result.success).toBe(true);
    expect(result.notification?.id).toBeTruthy();
    expect(result.notification?.type).toBe("assessment_complete");
    expect(result.notification?.title).toBe("Blueprint ready");

    const rows = mockSupabase.tables["notifications"] ?? [];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      user_id: USER_A,
      type: "assessment_complete",
      title: "Blueprint ready",
      read: false,
    });
  });

  it("creates a notification for another user via RPC", async () => {
    mockSupabase.setSession(USER_A);

    const result = await createNotification(
      USER_B,
      "partner_invite",
      "Invite",
      "You have a partner invite.",
      { pairing_id: "p1", href: "/invite/abc" },
    );

    expect(result.success).toBe(true);
    const rpc = mockSupabase.rpcCalls.find(
      (c) => c.fn === "create_notification_for_user",
    );
    expect(rpc).toBeTruthy();
    expect(rpc!.args).toMatchObject({
      target_user_id: USER_B,
      notification_type: "partner_invite",
      notification_title: "Invite",
      notification_data: { pairing_id: "p1", href: "/invite/abc" },
    });
  });

  it("retrieves notifications with unread count", async () => {
    mockSupabase.setSession(USER_A);
    mockSupabase.seed("notifications", [
      {
        id: "n1",
        user_id: USER_A,
        type: "partner_invite",
        title: "Invite 1",
        message: "m",
        data: null,
        read: false,
        created_at: "2026-08-01T10:00:00.000Z",
      },
      {
        id: "n2",
        user_id: USER_A,
        type: "system",
        title: "Notice",
        message: "m",
        data: null,
        read: true,
        created_at: "2026-08-01T11:00:00.000Z",
      },
      {
        id: "n3",
        user_id: USER_B, // not the current user's
        type: "system",
        title: "Other",
        message: "m",
        data: null,
        read: false,
        created_at: "2026-08-01T12:00:00.000Z",
      },
    ]);

    const result = await getNotifications(USER_A);

    expect(result.success).toBe(true);
    expect(result.unreadCount).toBe(1);
    expect(result.notifications).toHaveLength(2);
    // newest first
    expect(result.notifications[0].id).toBe("n2");
    expect(result.notifications[1].id).toBe("n1");
  });

  it("marks a notification as read", async () => {
    mockSupabase.setSession(USER_A);
    mockSupabase.seed("notifications", [
      { id: "n1", user_id: USER_A, read: false },
    ]);

    const result = await markAsRead("n1");
    expect(result.success).toBe(true);
    expect(mockSupabase.tables["notifications"]?.[0]?.read).toBe(true);
  });

  it("marks all notifications as read", async () => {
    mockSupabase.setSession(USER_A);
    mockSupabase.seed("notifications", [
      { id: "n1", user_id: USER_A, read: false },
      { id: "n2", user_id: USER_A, read: false },
      { id: "n3", user_id: USER_A, read: true },
    ]);

    const result = await markAllAsRead(USER_A);
    expect(result.success).toBe(true);
    const rows = mockSupabase.tables["notifications"] ?? [];
    expect(rows.every((r) => r.read === true)).toBe(true);
  });

  it("rejects cross-user access to notifications", async () => {
    mockSupabase.setSession(USER_A);
    const result = await getNotifications(USER_B);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated.");
  });

  it("suppresses in-app notifications when the user opted out", async () => {
    mockSupabase.setSession(USER_A);
    mockSupabase.seed("profiles", [
      {
        id: USER_A,
        notification_preferences: {
          email: { subscription: true },
          in_app: { subscription: false },
        },
      },
    ]);

    const result = await createNotification(
      USER_A,
      "subscription",
      "Silent",
      "Should not be stored.",
    );
    expect(result.success).toBe(true);
    expect(result.notification).toBeUndefined();
    expect(mockSupabase.tables["notifications"] ?? []).toHaveLength(0);
  });

  it("returns merged preferences with defaults", async () => {
    mockSupabase.setSession(USER_A);
    mockSupabase.seed("profiles", [
      {
        id: USER_A,
        notification_preferences: {
          email: { subscription: false },
        },
      },
    ]);

    const result = await getNotificationPreferences(USER_A);
    expect(result.success).toBe(true);
    // Explicit override kept
    expect(result.preferences.email.subscription).toBe(false);
    // Defaults applied for the rest
    expect(result.preferences.email.partner_invite).toBe(true);
    expect(result.preferences.in_app.partner_invite).toBe(true);
  });
});
