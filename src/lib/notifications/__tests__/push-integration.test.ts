// ──────────────────────────────────────────────────────────────
// SolidGround — createNotification / sendMessage → push integration
// ──────────────────────────────────────────────────────────────
// Verifies the Expo Push wiring at the action level:
//   • createNotification invokes sendPushForUser for the recipient and
//     returns success WITHOUT erroring when EXPO_ACCESS_TOKEN is unset
//     (the real push helper degrades to a no-op).
//   • sendMessage creates a `new_message` in-app notification for the OTHER
//     partner (cross-user RPC) and pushes it, without breaking the send.
//   • sendMessage sends NO notification/push to self or when there is no
//     distinct recipient.
//
// sendPushForUser is spied (calls through to the REAL helper — the real
// expo-server-sdk is loaded but never reached because EXPO_ACCESS_TOKEN is
// left unset, exercising the degrade path). No real network.
// ──────────────────────────────────────────────────────────────
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mockSupabase } from "@/lib/__tests__/helpers/supabaseMock";
import { createNotification } from "@/lib/notifications/actions";
import { sendMessage } from "@/lib/pairings/actions";
import * as pushModule from "@/lib/notifications/push";

const USER_A = "user-a";
const USER_B = "user-b";

function seededPairing(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    inviter_user_id: USER_A,
    invitee_user_id: USER_B,
    inviter_session_id: "s1",
    invitee_session_id: "s2",
    status: "completed",
    ...overrides,
  };
}

describe("createNotification → push wiring", () => {
  let pushSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    mockSupabase.reset();
    delete process.env.EXPO_ACCESS_TOKEN; // unset → real helper degrades
    pushSpy = vi.spyOn(pushModule, "sendPushForUser");
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates the notification and invokes push without erroring when EXPO_ACCESS_TOKEN is unset", async () => {
    mockSupabase.setSession(USER_A);

    const result = await createNotification(
      USER_A,
      "assessment_complete",
      "Blueprint ready",
      "Your Compatibility Blueprint is ready.",
      { href: "/dashboard/blueprint" },
    );

    // In-app row written, no error (push unset must not break the action).
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    expect(mockSupabase.tables["notifications"] ?? []).toHaveLength(1);

    // Push was dispatched (fire-and-forget) with the recipient + type.
    expect(pushSpy).toHaveBeenCalledTimes(1);
    const [supabaseArg, userId, payload] = pushSpy.mock.calls[0] as [
      unknown,
      string,
      { type: string; title: string; body: string; data?: Record<string, unknown> },
    ];
    expect(supabaseArg).toBeTruthy();
    expect(userId).toBe(USER_A);
    expect(payload).toMatchObject({
      type: "assessment_complete",
      title: "Blueprint ready",
      body: "Your Compatibility Blueprint is ready.",
      data: { href: "/dashboard/blueprint" },
    });
  });

  it("skips push (no in-app row) when the user opted out of in_app for the type", async () => {
    mockSupabase.setSession(USER_A);
    mockSupabase.seed("profiles", [
      { id: USER_A, notification_preferences: { email: {}, in_app: { assessment_complete: false } } },
    ]);

    const result = await createNotification(
      USER_A,
      "assessment_complete",
      "Silent",
      "Should not push.",
    );

    expect(result.success).toBe(true);
    expect(mockSupabase.tables["notifications"] ?? []).toHaveLength(0);
    expect(pushSpy).not.toHaveBeenCalled();
  });
});

describe("sendMessage → new_message push wiring", () => {
  let pushSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    mockSupabase.reset();
    delete process.env.EXPO_ACCESS_TOKEN; // unset → real helper degrades
    pushSpy = vi.spyOn(pushModule, "sendPushForUser");
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends the message and creates a new_message notification+push for the OTHER partner", async () => {
    mockSupabase.setSession(USER_A);
    mockSupabase.seed("pairings", [seededPairing()]);

    const result = await sendMessage("p1", "Hello partner");
    expect(result.success).toBe(true);
    expect(result.messageId).toBeTruthy();
    expect(mockSupabase.tables["pairing_messages"] ?? []).toHaveLength(1);

    // Cross-user notification → create_notification_for_user RPC for USER_B.
    const rpc = mockSupabase.rpcCalls.find(
      (c) => c.fn === "create_notification_for_user" && (c.args.target_user_id as string) === USER_B,
    );
    expect(rpc).toBeTruthy();
    expect(rpc!.args).toMatchObject({
      notification_type: "new_message",
      notification_data: { pairing_id: "p1", from_user_id: USER_A, href: `/dashboard/pairings/p1` },
    });

    // Push dispatched for the recipient (fire-and-forget, degrades fine).
    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(pushSpy.mock.calls[0][1]).toBe(USER_B);
  });

  it("does not notify or push when there is no distinct recipient (self / incomplete pairing)", async () => {
    mockSupabase.setSession(USER_A);
    // invitee is null → the only partner is the sender; no recipient.
    mockSupabase.seed("pairings", [seededPairing({ invitee_user_id: null })]);

    const result = await sendMessage("p1", "Hello nobody");
    expect(result.success).toBe(true);
    expect(mockSupabase.tables["pairing_messages"] ?? []).toHaveLength(1);
    expect(mockSupabase.rpcCalls.filter((c) => c.fn === "create_notification_for_user")).toHaveLength(0);
    expect(pushSpy).not.toHaveBeenCalled();
  });
});
