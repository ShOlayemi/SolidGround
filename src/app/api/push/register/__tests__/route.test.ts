// ──────────────────────────────────────────────────────────────
// SolidGround — POST /api/push/register tests
// ──────────────────────────────────────────────────────────────
// Covers the Expo push-token registration route (bearer auth + validation
// + guard rails). Expo validation uses the real expo-server-sdk
// isExpoPushToken; the auth helper, service client, and DB upsert are
// faked — no network, no DB.
//
// Coverage:
//   • OPTIONS → 204 with CORS headers
//   • 401 for a missing/invalid bearer token
//   • 400 for a malformed body
//   • 400 for a missing / invalid expoPushToken
//   • 400 for an invalid platform
//   • 200 + upsert scoped to the AUTHENTICATED userId for a valid request
//   • 500 when the upsert fails (user-safe, never crashes)
// ──────────────────────────────────────────────────────────────
import { mock } from "bun:test";
import { describe, it, expect, beforeEach } from "vitest";
import { NextResponse } from "next/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
} as const;

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: CORS_HEADERS });
}
function optionsResponse() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

const VALID_TOKEN = "ExponentPushToken[aaaaaaaaaaaaaaaaaaaa]";

/** Fake token-bound client that records push_tokens upserts and can fail. */
const state = {
  upsertCalls: [] as Array<{ user_id: string; expo_push_token: string; platform: string | null }>,
  failUpsert: false as boolean,
};

function makeTokenSupabase() {
  return {
    from: (table: string) => {
      if (table !== "push_tokens") throw new Error(`Unexpected table: ${table}`);
      let payload: unknown;
      const builder: Record<string, unknown> = {};
      builder.upsert = async (p: unknown) => {
        payload = p;
        if (state.failUpsert) {
          return { error: { message: "db exploded" } };
        }
        state.upsertCalls.push(payload as never);
        return { error: null };
      };
      return builder;
    },
  };
}

// Mock the auth helper (reuse the real 401 contract). The route is imported
// AFTER the mocks are in place.
mock.module("@/lib/pairings/mobile-api", () => ({
  json,
  optionsResponse,
  authenticateRequest: async (request: Request) => {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : null;
    if (!token || token !== "test-token") {
      return { ok: false as const, response: json({ error: "Authentication required" }, 401) };
    }
    return { ok: true as const, userId: "user-authed", supabase: makeTokenSupabase() as never };
  },
}));

const { POST: registerPost, OPTIONS: registerOptions } = await import("../route");

function post(body: unknown, headers: Record<string, string> = {}) {
  return registerPost(
    new Request("http://localhost/api/push/register", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer test-token", ...headers },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  state.upsertCalls = [];
  state.failUpsert = false;
});

describe("POST /api/push/register", () => {
  it("OPTIONS returns 204 with CORS headers", async () => {
    const res = await registerOptions();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("returns 401 for a missing bearer token", async () => {
    const res = await post({ expoPushToken: VALID_TOKEN }, { Authorization: "" });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("Authentication required");
  });

  it("returns 400 for a malformed JSON body", async () => {
    const res = await registerPost(
      new Request("http://localhost/api/push/register", {
        method: "POST",
        headers: { Authorization: "Bearer test-token", "Content-Type": "application/json" },
        body: "{not-json",
      }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("Invalid request body.");
  });

  it("returns 400 when expoPushToken is missing", async () => {
    const res = await post({ platform: "ios" });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("expoPushToken is required.");
  });

  it("returns 400 when expoPushToken is invalid", async () => {
    const res = await post({ expoPushToken: "not-a-valid-expo-token" });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("Invalid Expo push token.");
  });

  it("returns 400 when platform is not ios/android", async () => {
    const res = await post({ expoPushToken: VALID_TOKEN, platform: "web" });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("platform must be 'ios' or 'android'.");
  });

  it("upserts scoped to the AUTHENTICATED userId for a valid request", async () => {
    const res = await post({ expoPushToken: VALID_TOKEN, platform: "android" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok?: boolean };
    expect(body).toEqual({ ok: true });

    expect(state.upsertCalls).toHaveLength(1);
    expect(state.upsertCalls[0]).toEqual({
      user_id: "user-authed", // never a client-supplied id
      expo_push_token: VALID_TOKEN,
      platform: "android",
    });
  });

  it("accepts a null/omitted platform (stored as null)", async () => {
    const res = await post({ expoPushToken: VALID_TOKEN, platform: null });
    expect(res.status).toBe(200);
    expect(state.upsertCalls[0]?.platform).toBeNull();
  });

  it("returns 500 (user-safe) when the upsert fails", async () => {
    state.failUpsert = true;
    const res = await post({ expoPushToken: VALID_TOKEN });
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error?: string };
    expect(typeof body.error).toBe("string");
    expect(body.error).not.toMatch(/db exploded/i);
  });
});
