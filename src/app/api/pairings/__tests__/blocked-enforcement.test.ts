// ──────────────────────────────────────────────────────────────
// SolidGround AI — Blocked-user enforcement on pairing routes
// ──────────────────────────────────────────────────────────────
// Covers the Sprint 8 §7 blocked-user enforcement added to
//   POST /api/pairings/accept, /disconnect, /refresh
// (src/app/api/pairings/{accept,disconnect,refresh}/route.ts).
//
// Because the routes use the SERVICE client (which bypasses RLS, so
// migration 036's narrowed policies do not protect them), each route
// now calls pairingIsBlocked() before acting:
//   • blocked invitee accepting  → 400 generic "no longer available"
//     copy (must NOT reveal a block exists)
//   • blocked participant disconnecting → 404 "Pairing not found."
//   • blocked participant refreshing    → 404 "Pairing not found."
//   • RPC failure → 500 user-safe (fail closed)
//   • unblocked flows unchanged (accept 200, disconnect 200, refresh 200)
//
// The auth helper, the service client, and pairingIsBlocked are all
// mocked — no network, no DB. computeAlignment stays real (pure) so
// the unblocked paths exercise the actual accept/refresh computation.
// Runner: `bun test` (the repo's suite; vitest-style imports).
// ──────────────────────────────────────────────────────────────
import { mock } from "bun:test";
import { describe, it, expect, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// ── Shared fakes ──────────────────────────────────────────────
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

/** BlueprintResults fixture (one category is enough for computeAlignment). */
const RESULTS = {
  sessionId: "session-1",
  userId: "user-test-1",
  categoryResults: [
    { category: "communication", score: 60, questionScores: { q1: 60 }, dealBreakerTriggered: false },
  ],
  overallScore: 60,
  overallConfidence: 0.8,
  completedAt: "2026-08-12T00:00:00.000Z",
};

const FAKE_REPORT = {
  pairingId: "pairing-1",
  overallCompatibility: 50,
  categoryComparisons: [],
  sharedStrengths: [],
  potentialConflicts: [],
  conversationGuides: [],
  growthOpportunities: [],
  dealBreakerIntersections: [],
};

/** DB state the fake service client reads/writes. */
const state = {
  pairing: null as Record<string, unknown> | null,
  invitation: null as Record<string, unknown> | null,
  session: { id: "session-1" },
  pairingUpdates: 0,
  pairingDeletes: 0,
};

/** Mutable result of the mocked pairingIsBlocked: false | true | "throw". */
let blockMode: boolean | "throw" = false;

/** Audit rows written through the mocked auditLog. */
let auditCalls: Array<Record<string, unknown>> = [];

function makeService() {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  let pendingOp: "update" | "delete" | null = null;
  builder.select = chain;
  builder.eq = chain;
  builder.order = chain;
  builder.limit = chain;
  builder.single = async () => {
    if (state.pairing) return { data: state.pairing, error: null };
    return { data: null, error: { message: "not found" } };
  };
  builder.maybeSingle = async () => {
    if (state.invitation) return { data: state.invitation, error: null };
    return { data: null, error: null };
  };
  builder.update = () => {
    pendingOp = "update";
    return builder;
  };
  builder.delete = () => {
    pendingOp = "delete";
    return builder;
  };
  builder.insert = async () => ({ data: null, error: null });
  // .update(v).eq(...) / .delete().eq(...) chains are awaited, so the
  // builder doubles as a thenable that resolves to the query result.
  builder.then = async (resolve: (v: unknown) => unknown) => {
    if (pendingOp === "update") state.pairingUpdates += 1;
    if (pendingOp === "delete") state.pairingDeletes += 1;
    pendingOp = null;
    return resolve({ data: null, error: null });
  };
  return { from: () => builder };
}

function makeTokenSupabase() {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  builder.select = chain;
  builder.eq = chain;
  builder.order = chain;
  builder.limit = chain;
  builder.maybeSingle = async () => ({ data: state.session, error: null });
  return { from: () => builder };
}

// Mock the auth helper (reuse the real 401 contract), the service
// client factory, and the blocked helper. Routes are dynamically
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
    return { ok: true as const, userId: "user-test-1", supabase: makeTokenSupabase() as never };
  },
  auditLog: async (userId: string, action: string, resource: string, resourceId: string, details: Record<string, unknown>) => {
    auditCalls.push({ userId, action, resource, resourceId, details });
  },
  getSessionResults: async () => RESULTS,
  resolveLatestCompletedSession: async () => "session-1",
  saveComparisonReport: async () => ({ ok: true, report: FAKE_REPORT }),
  notifyInviteAccepted: async () => {},
}));

mock.module("@/lib/supabase/server", () => ({
  createServiceClient: async () => makeService() as never,
}));

mock.module("@/lib/pairings/blocked", () => ({
  pairingIsBlocked: async () => {
    if (blockMode === "throw") throw new Error("rpc exploded");
    return blockMode;
  },
}));

const { POST: acceptPost, OPTIONS: acceptOptions } = await import("../accept/route");
const { POST: disconnectPost, OPTIONS: disconnectOptions } = await import("../disconnect/route");
const { POST: refreshPost, OPTIONS: refreshOptions } = await import("../refresh/route");

// ── Fixtures ──────────────────────────────────────────────────
/** Pending invite from another user, awaiting this user's accept. */
function pendingPairing() {
  return {
    id: "pairing-1",
    invite_code: "ABC12345",
    inviter_user_id: "user-inviter",
    invitee_user_id: null,
    inviter_session_id: "session-inviter",
    invitee_session_id: null,
    status: "pending",
    relationship_type: "romantic",
    alignment_results: { inviter_results: RESULTS },
    created_at: "2026-08-12T00:00:00.000Z",
  };
}

/** Completed pairing the caller (user-test-1) belongs to. */
function completedPairing() {
  return {
    id: "pairing-1",
    invite_code: "ABC12345",
    inviter_user_id: "user-inviter",
    invitee_user_id: "user-test-1",
    inviter_session_id: "session-inviter",
    invitee_session_id: "session-1",
    status: "completed",
    relationship_type: "romantic",
    alignment_results: null,
    created_at: "2026-08-12T00:00:00.000Z",
  };
}

function post(handler: (r: Request) => Promise<Response>, body: unknown, headers: Record<string, string> = {}) {
  return handler(
    new Request("http://localhost/api/pairings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer test-token", ...headers },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  blockMode = false;
  auditCalls = [];
  state.pairing = null;
  state.invitation = null;
  state.pairingUpdates = 0;
  state.pairingDeletes = 0;
});

// ── Tests ─────────────────────────────────────────────────────
describe("blocked-user enforcement: POST /api/pairings/accept", () => {
  it("OPTIONS returns 204 with CORS headers", async () => {
    const res = await acceptOptions();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("returns 401 for a missing bearer token", async () => {
    const res = await post(acceptPost, { inviteCode: "ABC12345" }, { Authorization: "" });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("Authentication required");
  });

  it("returns 400 with the generic unavailable copy when the pairing is blocked (never reveals the block)", async () => {
    state.pairing = pendingPairing();
    blockMode = true;
    const res = await post(acceptPost, { inviteCode: "ABC12345" });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("This invite is no longer available.");
    expect(body.error).not.toMatch(/block/i);
    expect(state.pairingUpdates).toBe(0); // accept never performed
  });

  it("returns 400 with the same copy for an expired/completed invite (unchanged)", async () => {
    state.pairing = { ...pendingPairing(), status: "completed" };
    blockMode = false;
    const res = await post(acceptPost, { inviteCode: "ABC12345" });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("This invite is no longer available.");
  });

  it("returns 500 (user-safe, fail closed) when the block-check RPC errors", async () => {
    state.pairing = pendingPairing();
    blockMode = "throw";
    const res = await post(acceptPost, { inviteCode: "ABC12345" });
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error?: string };
    expect(typeof body.error).toBe("string");
    expect(body.error).not.toMatch(/rpc|exploded/i);
    expect(state.pairingUpdates).toBe(0);
  });

  it("accepts an unblocked pending invite (unchanged flow)", async () => {
    state.pairing = pendingPairing();
    blockMode = false;
    const res = await post(acceptPost, { inviteCode: "ABC12345" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success?: boolean; pairingId?: string };
    expect(body).toEqual({ success: true, pairingId: "pairing-1" });
    expect(state.pairingUpdates).toBe(1);
    expect(auditCalls.some((a) => a.action === "pairing.accept")).toBe(true);
  });
});

describe("blocked-user enforcement: POST /api/pairings/disconnect", () => {
  it("OPTIONS returns 204 with CORS headers", async () => {
    const res = await disconnectOptions();
    expect(res.status).toBe(204);
  });

  it("returns 404 with the not-found copy when the pairing is blocked (never reveals the block)", async () => {
    state.pairing = completedPairing();
    blockMode = true;
    const res = await post(disconnectPost, { pairingId: "pairing-1" });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("Pairing not found.");
    expect(body.error).not.toMatch(/block/i);
    expect(state.pairingDeletes).toBe(0); // never deleted
  });

  it("returns 500 (user-safe, fail closed) when the block-check RPC errors", async () => {
    state.pairing = completedPairing();
    blockMode = "throw";
    const res = await post(disconnectPost, { pairingId: "pairing-1" });
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error?: string };
    expect(typeof body.error).toBe("string");
    expect(body.error).not.toMatch(/rpc|exploded/i);
    expect(state.pairingDeletes).toBe(0);
  });

  it("returns 403 for a non-participant (unchanged)", async () => {
    state.pairing = { ...completedPairing(), inviter_user_id: "user-a", invitee_user_id: "user-b" };
    blockMode = false;
    const res = await post(disconnectPost, { pairingId: "pairing-1" });
    expect(res.status).toBe(403);
  });

  it("disconnects an unblocked participant pairing (unchanged flow)", async () => {
    state.pairing = completedPairing();
    blockMode = false;
    const res = await post(disconnectPost, { pairingId: "pairing-1" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success?: boolean };
    expect(body).toEqual({ success: true });
    expect(state.pairingDeletes).toBe(1);
    expect(auditCalls.some((a) => a.action === "pairing.disconnect")).toBe(true);
  });
});

describe("blocked-user enforcement: POST /api/pairings/refresh", () => {
  it("OPTIONS returns 204 with CORS headers", async () => {
    const res = await refreshOptions();
    expect(res.status).toBe(204);
  });

  it("returns 404 with the not-found copy when the pairing is blocked (never reveals the block)", async () => {
    state.pairing = completedPairing();
    blockMode = true;
    const res = await post(refreshPost, { pairingId: "pairing-1" });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("Pairing not found.");
    expect(body.error).not.toMatch(/block/i);
    expect(state.pairingUpdates).toBe(0); // alignment update never ran
  });

  it("returns 500 (user-safe, fail closed) when the block-check RPC errors", async () => {
    state.pairing = completedPairing();
    blockMode = "throw";
    const res = await post(refreshPost, { pairingId: "pairing-1" });
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error?: string };
    expect(typeof body.error).toBe("string");
    expect(body.error).not.toMatch(/rpc|exploded/i);
    expect(state.pairingUpdates).toBe(0);
  });

  it("returns 403 for a non-participant (unchanged)", async () => {
    state.pairing = { ...completedPairing(), inviter_user_id: "user-a", invitee_user_id: "user-b" };
    blockMode = false;
    const res = await post(refreshPost, { pairingId: "pairing-1" });
    expect(res.status).toBe(403);
  });

  it("refreshes an unblocked participant pairing (unchanged flow)", async () => {
    state.pairing = completedPairing();
    blockMode = false;
    const res = await post(refreshPost, { pairingId: "pairing-1" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success?: boolean; pairingId?: string; report?: { overallCompatibility?: number } };
    expect(body.success).toBe(true);
    expect(body.pairingId).toBe("pairing-1");
    expect(body.report?.overallCompatibility).toBe(50);
    expect(state.pairingUpdates).toBe(1); // alignment_results refresh ran
    expect(auditCalls.some((a) => a.action === "comparison_report.refresh")).toBe(true);
  });
});
