// ──────────────────────────────────────────────────────────────
// SolidGround — Expo Push helper unit tests
// ──────────────────────────────────────────────────────────────
// Exercises src/lib/notifications/push.ts (sendPushForUser) — the
// fire-and-forget push path. Never makes a real Expo network call:
// expo-server-sdk is mocked here (bun `mock.module`, matching the repo's
// route tests). push.ts is imported AFTER the mock is installed.
//
// Coverage:
//   • degradation when process.env.EXPO_ACCESS_TOKEN is unset (skip)
//   • skip when the recipient has no registered push token
//   • skip when the stored token is not a valid Expo token
//   • send when everything is configured + prefs allow
//   • preference gates (push[type]=false; in_app[type]=false fallback)
//   • Expo throwing is swallowed (never throws into the caller)
// ──────────────────────────────────────────────────────────────
import { mock } from "bun:test";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mockSupabase } from "@/lib/__tests__/helpers/supabaseMock";

/** Mutable recorder shared by the mocked Expo client and the assertions. */
const calls = {
  send: [] as unknown[][],
  chunkCount: 0,
  rejectNext: false,
};

function isExpoPushToken(token: unknown) {
  return (
    typeof token === "string" &&
    (token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken["))
  );
}

mock.module("expo-server-sdk", () => ({
  Expo: class Expo {
    static isExpoPushToken = isExpoPushToken;
    chunkPushNotifications(msgs: unknown[]): unknown[][] {
      calls.chunkCount += 1;
      return [msgs];
    }
    sendPushNotificationsAsync(msgs: unknown[]): Promise<unknown[]> {
      if (calls.rejectNext) {
        calls.rejectNext = false;
        return Promise.reject(new Error("Expo HTTP 500"));
      }
      calls.send.push(msgs);
      return Promise.resolve([]);
    }
  },
}));

const { sendPushForUser } = await import("@/lib/notifications/push");

const VALID_TOKEN = "ExponentPushToken[aaaaaaaaaaaaaaaaaaaa]";
const USER = "user-push-test";

describe("sendPushForUser (fire-and-forget push)", () => {
  beforeEach(() => {
    mockSupabase.reset();
    calls.send = [];
    calls.chunkCount = 0;
    calls.rejectNext = false;
    process.env.EXPO_ACCESS_TOKEN = "test-expo-access-token";
  });
  afterEach(() => {
    delete process.env.EXPO_ACCESS_TOKEN;
  });

  it("degrades (no-op) when EXPO_ACCESS_TOKEN is unset", async () => {
    delete process.env.EXPO_ACCESS_TOKEN;
    mockSupabase.seed("push_tokens", [{ user_id: USER, expo_push_token: VALID_TOKEN }]);

    await expect(
      sendPushForUser(mockSupabase.client as never, USER, {
        type: "connection_request",
        title: "Hi",
        body: "There",
      }),
    ).resolves.toBeUndefined();

    expect(calls.send).toHaveLength(0);
    expect(calls.chunkCount).toBe(0);
  });

  it("skips when the recipient has no registered push token", async () => {
    await sendPushForUser(mockSupabase.client as never, USER, {
      type: "connection_request",
      title: "Hi",
      body: "There",
    });

    expect(calls.send).toHaveLength(0);
    expect(calls.chunkCount).toBe(0);
  });

  it("skips when the stored token is not a valid Expo token", async () => {
    mockSupabase.seed("push_tokens", [{ user_id: USER, expo_push_token: "not-a-token" }]);

    await sendPushForUser(mockSupabase.client as never, USER, {
      type: "connection_request",
      title: "Hi",
      body: "There",
    });

    expect(calls.send).toHaveLength(0);
  });

  it("sends with sound/title/body/data when configured and allowed", async () => {
    mockSupabase.seed("push_tokens", [{ user_id: USER, expo_push_token: VALID_TOKEN }]);

    await sendPushForUser(mockSupabase.client as never, USER, {
      type: "connection_request",
      title: "New connection request",
      body: "Someone wants to connect.",
      data: { href: "/dashboard/requests" },
    });

    expect(calls.chunkCount).toBe(1);
    expect(calls.send).toHaveLength(1);
    const sent = calls.send[0] as Array<Record<string, unknown>>;
    expect(sent[0]).toMatchObject({
      to: VALID_TOKEN,
      sound: "default",
      title: "New connection request",
      body: "Someone wants to connect.",
      data: { href: "/dashboard/requests" },
    });
  });

  it("skips when push preference for the type is explicitly false", async () => {
    mockSupabase.seed("push_tokens", [{ user_id: USER, expo_push_token: VALID_TOKEN }]);
    mockSupabase.seed("profiles", [
      { id: USER, notification_preferences: { email: {}, in_app: {}, push: { connection_request: false } } },
    ]);

    await sendPushForUser(mockSupabase.client as never, USER, {
      type: "connection_request",
      title: "Hi",
      body: "There",
    });

    expect(calls.send).toHaveLength(0);
  });

  it("skips when push pref is unset but in_app preference for the type is false (fallback)", async () => {
    mockSupabase.seed("push_tokens", [{ user_id: USER, expo_push_token: VALID_TOKEN }]);
    mockSupabase.seed("profiles", [
      { id: USER, notification_preferences: { email: {}, in_app: { connection_request: false } } },
    ]);

    await sendPushForUser(mockSupabase.client as never, USER, {
      type: "connection_request",
      title: "Hi",
      body: "There",
    });

    expect(calls.send).toHaveLength(0);
  });

  it("sends when a push preference exists but is not false for the type (default allow)", async () => {
    mockSupabase.seed("push_tokens", [{ user_id: USER, expo_push_token: VALID_TOKEN }]);
    mockSupabase.seed("profiles", [
      { id: USER, notification_preferences: { email: {}, in_app: {}, push: { new_message: true } } },
    ]);

    await sendPushForUser(mockSupabase.client as never, USER, {
      type: "connection_request",
      title: "Hi",
      body: "There",
    });

    expect(calls.send).toHaveLength(1);
  });

  it("swallows a throwing Expo client (never throws into the caller)", async () => {
    mockSupabase.seed("push_tokens", [{ user_id: USER, expo_push_token: VALID_TOKEN }]);
    calls.rejectNext = true;

    await expect(
      sendPushForUser(mockSupabase.client as never, USER, {
        type: "new_message",
        title: "New message",
        body: "hi",
      }),
    ).resolves.toBeUndefined();
  });
});
