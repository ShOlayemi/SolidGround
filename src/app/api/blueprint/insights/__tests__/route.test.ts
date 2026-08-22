// ──────────────────────────────────────────────────────────────
// SolidGround AI — Blueprint AI Insights Route Unit Tests
// ──────────────────────────────────────────────────────────────
// Covers GET /api/blueprint/insights (src/app/api/blueprint/insights/route.ts):
//   204   — OPTIONS preflight with CORS headers.
//   401   — missing/invalid bearer token (auth helper mocked, mirrors the
//           real 401 contract).
//   404   — no completed assessment ("Complete your assessment first"),
//           and the "readiness results not found" generation case.
//   200   — cached insight served from ai_insights (cached:true); fresh
//           insight generation (cached:false); the mobile-friendly shape.
//   500   — generation failure maps to a plain user-safe body.
// The auth helper and the get-or-generate layer are mocked — no network, no
// OpenAI, no database. Runner: `bun test` (the repo's suite; vitest-style).
// ──────────────────────────────────────────────────────────────
import { mock } from "bun:test";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

// ── Fakes ─────────────────────────────────────────────────────
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
} as const;

/** Docs-legal AI insight payload (also mirrors the MockProvider shape). */
const INSIGHTS = {
  sessionId: "session-1",
  blueprintSummary: "Your Compatibility Blueprint™ shows an overall score of 81/100.",
  personalStrengths: ["Strong communication", "Self-awareness"],
  growthOpportunities: ["Exploring money alignment", "Conflict resolution"],
  reflectionQuestions: ["What surprised you most?"],
  communicationRecommendations: ["Use 'I feel' statements"],
  relationshipReadiness: {
    level: "High",
    summary: "You show strong readiness for a serious relationship.",
    strengths: ["Communication awareness"],
    areas_to_develop: ["Continued self-reflection"],
  },
  generatedAt: "2026-08-22T10:00:00.000Z",
};

/**
 * Minimal query-builder fake for the one session lookup the route performs:
 * from().select().eq().eq().order().limit().maybeSingle().
 */
function fakeSupabase(sessionResult: unknown) {
  return {
    auth: {},
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
                  order: () => ({
                    limit: () => ({
                      // Real Supabase maybeSingle() resolves { data, error }.
                      maybeSingle: async () => ({ data: sessionResult, error: null }),
                    }),
                  }),
                }),
        }),
      }),
    }),
  };
}

// Outcome of getOrGenerateInsights(): "cached" | "fresh" | "results-missing" |
// "failure" | "error-return".
type GenMode = "cached" | "fresh" | "results-missing" | "failure" | "not-auth";
let genMode: GenMode = "fresh";
/** The session lookup result: null (no completed session) or a session row. */
let sessionResult: unknown = { id: "session-1", user_id: "user-1", status: "completed" };
/** What authenticateRequest hands back: ok user+client, or a 401 response. */
let authResult:
  | { ok: true; userId: string; supabase: unknown }
  | { ok: false; response: Response };

mock.module("@/lib/pairings/mobile-api", () => ({
  json: (body: unknown, status: number) => NextResponse.json(body, { status, headers: CORS_HEADERS }),
  optionsResponse: () => new NextResponse(null, { status: 204, headers: CORS_HEADERS }),
  authenticateRequest: async () => authResult,
}));

const mockGetOrGenerateInsights = vi.fn((sessionId: string, client?: unknown, userId?: string) => {
  if (genMode === "cached") {
    return { success: true, cached: true, insights: { ...INSIGHTS } };
  }
  if (genMode === "fresh") {
    return { success: true, cached: false, insights: { ...INSIGHTS } };
  }
  if (genMode === "results-missing") {
    return { success: false, error: "Blueprint results not found for this session." };
  }
  if (genMode === "not-auth") {
    return { success: false, error: "Not authenticated." };
  }
  return { success: false, error: "Failed to generate AI insights." };
});
mock.module("@/lib/ai/service", () => ({
  getOrGenerateInsights: mockGetOrGenerateInsights,
}));

const { GET, OPTIONS } = await import("../route");

// ── Helpers ───────────────────────────────────────────────────
function get(token?: string): Promise<Response> {
  return GET(
    new Request("http://localhost/api/blueprint/insights", {
      method: "GET",
      headers: { ...(token ? { Authorization: token } : {}) },
    }),
  );
}

beforeEach(() => {
  genMode = "fresh";
  sessionResult = { id: "session-1", user_id: "user-1", status: "completed" };
  authResult = { ok: true, userId: "user-1", supabase: fakeSupabase(sessionResult) };
  mockGetOrGenerateInsights.mockClear();
});

describe("OPTIONS /api/blueprint/insights", () => {
  it("returns 204 with CORS headers", async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Headers")).toBe("Authorization, Content-Type");
    expect(res.headers.get("Access-Control-Allow-Methods")).toBe("POST, OPTIONS");
  });
});

describe("GET /api/blueprint/insights — auth", () => {
  it("returns 401 for a missing bearer token", async () => {
    authResult = {
      ok: false,
      response: NextResponse.json({ error: "Authentication required" }, { status: 401, headers: CORS_HEADERS }),
    };
    const res = await get();
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("Authentication required");
    expect(mockGetOrGenerateInsights).not.toHaveBeenCalled();
  });

  it("returns 401 for an invalid bearer token", async () => {
    authResult = {
      ok: false,
      response: NextResponse.json({ error: "Authentication required" }, { status: 401, headers: CORS_HEADERS }),
    };
    const res = await get("Bearer not-a-real-token");
    expect(res.status).toBe(401);
    expect(mockGetOrGenerateInsights).not.toHaveBeenCalled();
  });
});

describe("GET /api/blueprint/insights — session resolution", () => {
  it("returns 404 when the user has no completed assessment", async () => {
    sessionResult = null;
    authResult = { ok: true, userId: "user-1", supabase: fakeSupabase(null) };
    const res = await get("Bearer test-token");
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("Complete your assessment first");
    expect(mockGetOrGenerateInsights).not.toHaveBeenCalled();
  });

  it("returns 500 on a session query error", async () => {
    const failing = {
      auth: {},
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: async () => ({ data: null, error: { message: "boom" } }),
                }),
              }),
            }),
          }),
        }),
      }),
    };
    authResult = { ok: true, userId: "user-1", supabase: failing };
    const res = await get("Bearer test-token");
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("Failed to load insights.");
  });
});

describe("GET /api/blueprint/insights — success shapes", () => {
  it("returns 200 with cached:true and the mobile-friendly shape on a cache hit", async () => {
    genMode = "cached";
    const res = await get("Bearer test-token");
    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    const body = (await res.json()) as {
      success: boolean;
      cached: boolean;
      insights: typeof INSIGHTS;
    };
    expect(body.success).toBe(true);
    expect(body.cached).toBe(true);
    expect(body.insights.sessionId).toBe("session-1");
    expect(body.insights.blueprintSummary).toBe(INSIGHTS.blueprintSummary);
    expect(body.insights.personalStrengths).toEqual(INSIGHTS.personalStrengths);
    expect(body.insights.growthOpportunities).toEqual(INSIGHTS.growthOpportunities);
    expect(body.insights.reflectionQuestions).toEqual(INSIGHTS.reflectionQuestions);
    expect(body.insights.communicationRecommendations).toEqual(INSIGHTS.communicationRecommendations);
    expect(body.insights.relationshipReadiness).toEqual(INSIGHTS.relationshipReadiness);
    expect(body.insights.generatedAt).toBe(INSIGHTS.generatedAt);
    // The token-bound client + verified userId are forwarded to the caching layer.
    expect(mockGetOrGenerateInsights).toHaveBeenCalledWith("session-1", expect.anything(), "user-1");
  });

  it("returns 200 with cached:false after generating fresh insights", async () => {
    genMode = "fresh";
    const res = await get("Bearer test-token");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; cached: boolean };
    expect(body.success).toBe(true);
    expect(body.cached).toBe(false);
  });
});

describe("GET /api/blueprint/insights — failure mapping", () => {
  it("returns 404 when the results row is missing for the session", async () => {
    genMode = "results-missing";
    const res = await get("Bearer test-token");
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("Complete your assessment first");
  });

  it("returns 500 with a plain user-safe body on generation failure", async () => {
    genMode = "failure";
    const res = await get("Bearer test-token");
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error?: string };
    expect(typeof body.error).toBe("string");
    // Never leak raw internals.
    expect(body.error).not.toContain("OPENAI");
  });
});
