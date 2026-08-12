// ──────────────────────────────────────────────────────────────
// SolidGround AI — Account Delete Route Unit Tests
// ──────────────────────────────────────────────────────────────
// Covers POST /api/account/delete (src/app/api/account/delete/route.ts):
//   401 — missing/invalid bearer token (auth helper mocked, mirrors
//         the real 401 contract).
//   400 — non-JSON body / non-object body (array, string, null).
//   200 — mocked admin delete: { ok: true } only; audit row written
//         FIRST with action 'account.delete' and no sensitive fields;
//         a client-supplied user_id in the body is IGNORED — the
//         authenticated token user is deleted.
//   500 — admin delete throws or returns an error: plain user-safe
//         body, no raw error text.
// The auth helper and the admin client are mocked — no network, no
// DB. Runner: `bun test` (the repo's suite; vitest-style imports).
// ──────────────────────────────────────────────────────────────
import { mock } from "bun:test";
import { describe, it, expect, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// ── Fakes ─────────────────────────────────────────────────────
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

/** Fake admin.deleteUser behavior: "ok" | "throw" | "error". */
let deleteMode: "ok" | "throw" | "error" = "ok";
/** User ids passed to admin.auth.admin.deleteUser (assertions read these). */
let deletedUserIds: string[] = [];
/** Audit rows written through the mocked auditLog. */
let auditCalls: Array<Record<string, unknown>> = [];

// Mock the auth helper (reuse the real 401 contract), the admin
// client factory, and the audit helper. The route is dynamically
// imported AFTER these so the mocks are in place.
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
    return { ok: true as const, userId: "user-test-1", supabase: {} };
  },
  auditLog: async (userId: string, action: string, resource: string, resourceId: string, details: Record<string, unknown>) => {
    auditCalls.push({ userId, action, resource, resourceId, details });
  },
}));

mock.module("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      admin: {
        deleteUser: async (userId: string) => {
          deletedUserIds.push(userId);
          if (deleteMode === "throw") throw new Error("admin exploded");
          if (deleteMode === "error") return { data: null, error: { message: "delete failed" } };
          return { data: { user: { id: userId } }, error: null };
        },
      },
    },
  }),
}));

const { POST, OPTIONS } = await import("../route");

// ── Helpers ───────────────────────────────────────────────────
function post(body: unknown, headers: Record<string, string> = {}): Promise<Response> {
  return POST(
    new Request("http://localhost/api/account/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer test-token", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  deleteMode = "ok";
  deletedUserIds = [];
  auditCalls = [];
});

// ── Tests ─────────────────────────────────────────────────────
describe("POST /api/account/delete", () => {
  it("OPTIONS returns 204 with CORS headers", async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toBe("POST, OPTIONS");
  });

  it("returns 401 for a missing bearer token", async () => {
    const res = await post({}, { Authorization: "" });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("Authentication required");
    expect(deletedUserIds).toHaveLength(0);
  });

  it("returns 401 for an invalid bearer token", async () => {
    const res = await post({}, { Authorization: "Bearer not-a-real-token" });
    expect(res.status).toBe(401);
    expect(deletedUserIds).toHaveLength(0);
  });

  it("returns 400 for a non-JSON body", async () => {
    const res = await post("not json at all");
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("Invalid request body.");
    expect(deletedUserIds).toHaveLength(0);
  });

  it("returns 400 for a non-object body (array, string, null)", async () => {
    for (const body of [[1, 2], "just-a-string", null, 42]) {
      const res = await post(body as unknown);
      expect(res.status).toBe(400);
      const parsed = (await res.json()) as { error?: string };
      expect(parsed.error).toBe("Invalid request body.");
    }
    expect(deletedUserIds).toHaveLength(0);
  });

  it("returns 200 { ok: true } with an empty body and deletes the authenticated user", async () => {
    const res = await post("");
    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toEqual({ ok: true });
    expect(deletedUserIds).toEqual(["user-test-1"]);
  });

  it("writes the audit row first with action account.delete and no sensitive fields", async () => {
    await post("");
    expect(auditCalls).toHaveLength(1);
    const audit = auditCalls[0];
    expect(audit.action).toBe("account.delete");
    expect(audit.resource).toBe("account");
    expect(audit.resourceId).toBe("user-test-1");
    expect(audit.userId).toBe("user-test-1");
    expect(audit.details).toEqual({ source: "mobile" });
    // No private content, no email, no raw error anywhere in the row.
    const serialized = JSON.stringify(audit);
    expect(serialized).not.toMatch(/email/i);
    expect(serialized).not.toMatch(/error/i);
  });

  it("ignores a client-supplied user_id in the body (deletes the token user only)", async () => {
    const res = await post({ user_id: "someone-else", reason: "testing" });
    expect(res.status).toBe(200);
    expect(deletedUserIds).toEqual(["user-test-1"]); // NOT "someone-else"
  });

  it("returns 500 with a plain user-safe body when the admin delete throws", async () => {
    deleteMode = "throw";
    const res = await post("");
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("We could not complete deletion. Please try again.");
    expect(body.error).not.toMatch(/admin|exploded|stack/i);
  });

  it("returns 500 with a plain user-safe body when the admin delete returns an error", async () => {
    deleteMode = "error";
    const res = await post("");
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("We could not complete deletion. Please try again.");
    expect(body.error).not.toMatch(/delete failed/i);
  });
});
