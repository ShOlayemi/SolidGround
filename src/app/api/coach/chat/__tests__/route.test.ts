// ──────────────────────────────────────────────────────────────
// SolidGround AI — Coach Chat Route Unit Tests
// ──────────────────────────────────────────────────────────────
// Covers POST /api/coach/chat (src/app/api/coach/chat/route.ts):
//   401 — missing/invalid bearer token (auth helper mocked, mirrors
//         the real 401 contract).
//   400 — malformed bodies (non-JSON, bad message, bad history,
//         bad blueprintContext, over-length message).
//   200 — mocked OpenAI completion: { content } shape only; the
//         system prompt carries the Sprint 8 AI safety rules; the
//         composed user message contains the transcript + compact
//         Blueprint context and is history-capped server-side; a
//         manipulation request is refused and the refusal is returned.
//   200 — mock fallback: OPENAI_API_KEY unset OR NEXT_PUBLIC_AI_MODE=
//         mock → deterministic, safety-respecting mock reply (no
//         OpenAI client is created).
//   500 — OpenAI failure (live mode); empty completion.
// The auth helper and the OpenAI client are mocked — no network.
// Runner: `bun test` (the repo's suite; vitest-style imports).
// ──────────────────────────────────────────────────────────────
process.env.OPENAI_API_KEY = "test-key";

import { mock } from "bun:test";
import { describe, it, expect, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// ── Fakes ─────────────────────────────────────────────────────
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
} as const;

const NORMAL_REPLY = "That sounds like a really thoughtful question. Based on what you've shared…";
const REFUSAL_REPLY =
  "I can't help with tactics for controlling or manipulating a partner — but I can help you think about how to communicate openly and honestly about what you're feeling.";

/** Captured completions.create params (assertions read these). */
let capturedParams: Array<{ params: Record<string, unknown>; options: Record<string, unknown> }> = [];
/** Fake behavior: "ok" | "throw" | "empty". */
let fakeMode: "ok" | "throw" | "empty" = "ok";

const fakeOpenAIClient = {
  chat: {
    completions: {
      create: async (params: Record<string, unknown>, options?: Record<string, unknown>) => {
        capturedParams.push({ params, options: options ?? {} });
        if (fakeMode === "throw") throw new Error("upstream OpenAI failure");
        if (fakeMode === "empty") return { choices: [{ message: { content: "" } }] };
        const messages = params.messages as Array<{ role: string; content: string }>;
        const userMessage = messages.find((m) => m.role === "user")?.content ?? "";
        return {
          choices: [
            { message: { content: /manipulat/i.test(userMessage) ? REFUSAL_REPLY : NORMAL_REPLY } },
          ],
        };
      },
    },
  },
};

// Mock the auth helper (reuse the real 401 contract) and the OpenAI
// client factory. The route is dynamically imported AFTER these so the
// mocks are in place.
mock.module("@/lib/pairings/mobile-api", () => ({
  json: (body: unknown, status: number) => NextResponse.json(body, { status, headers: CORS_HEADERS }),
  optionsResponse: () => new NextResponse(null, { status: 204, headers: CORS_HEADERS }),
  authenticateRequest: async (request: Request) => {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : null;
    if (!token || token !== "test-token") {
      return { ok: false as const, response: NextResponse.json({ error: "Authentication required" }, { status: 401, headers: CORS_HEADERS }) };
    }
    return { ok: true as const, userId: "user-test-1", supabase: {} };
  },
}));

mock.module("@/lib/ai/service", () => ({
  getOpenAI: () => {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set in environment.");
    }
    return fakeOpenAIClient as never;
  },
}));

const { POST, OPTIONS } = await import("../route");

// ── Helpers ───────────────────────────────────────────────────
function post(body: unknown, headers: Record<string, string> = {}): Promise<Response> {
  return POST(
    new Request("http://localhost/api/coach/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer test-token", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

function validBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    message: "How do we talk about money without it turning into a fight?",
    conversationId: "conv-123",
    history: [
      { role: "user", content: "We keep arguing about money." },
      { role: "coach", content: "That sounds frustrating. What usually happens right before the argument?" },
    ],
    blueprintContext: {
      relationshipMode: "romantic",
      topStrengths: [
        { category: "communication", label: "Communication & Emotional Connection", questionText: "I listen before responding." },
      ],
      areasToExplore: [
        { category: "money", label: "Money & Finances", questionText: "I avoid discussing budgets." },
      ],
      domainSnippets: [
        { category: "communication", label: "Communication & Emotional Connection", score: 78 },
        { category: "money", label: "Money & Finances", score: 34, dealBreakerTriggered: true },
      ],
    },
    ...overrides,
  };
}

async function systemPromptOfLastCall(): Promise<string> {
  const last = capturedParams[capturedParams.length - 1];
  const messages = last.params.messages as Array<{ role: string; content: string }>;
  return messages.find((m) => m.role === "system")?.content ?? "";
}

beforeEach(() => {
  capturedParams = [];
  fakeMode = "ok";
  process.env.OPENAI_API_KEY = "test-key";
  delete process.env.NEXT_PUBLIC_AI_MODE;
});

describe("POST /api/coach/chat", () => {
  it("OPTIONS returns 204 with CORS headers", async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toBe("POST, OPTIONS");
  });

  it("returns 401 for a missing bearer token", async () => {
    const res = await post(validBody(), { Authorization: "" });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("Authentication required");
    expect(capturedParams).toHaveLength(0);
  });

  it("returns 401 for an invalid bearer token", async () => {
    const res = await post(validBody(), { Authorization: "Bearer not-a-real-token" });
    expect(res.status).toBe(401);
    expect(capturedParams).toHaveLength(0);
  });

  it("returns 400 for a non-JSON body", async () => {
    const res = await post("not json at all");
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("Invalid request body.");
  });

  it("returns 400 when message is missing, empty, or non-string", async () => {
    for (const overrides of [
      { message: undefined },
      { message: "   " },
      { message: 42 },
      { message: null },
    ]) {
      const res = await post(validBody(overrides));
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error?: string };
      expect(typeof body.error).toBe("string");
    }
  });

  it("returns 400 when message exceeds the length cap", async () => {
    const res = await post(validBody({ message: "x".repeat(4001) }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toMatch(/too long/);
  });

  it("returns 400 for a malformed history", async () => {
    const badHistories = [
      "not-an-array",
      [{ role: "system", content: "nope" }],
      [{ role: "user", content: 42 }],
      [null],
    ];
    for (const history of badHistories) {
      const res = await post(validBody({ history }));
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error?: string };
      expect(typeof body.error).toBe("string");
    }
  });

  it("returns 400 for a malformed blueprintContext", async () => {
    const badContexts = [
      "not-an-object",
      { relationshipMode: "corporate" },
      { relationshipMode: "romantic", topStrengths: "nope" },
      {
        relationshipMode: "romantic",
        topStrengths: [{ category: "money", label: "Money" }], // missing questionText
        areasToExplore: [],
        domainSnippets: [],
      },
      {
        relationshipMode: "romantic",
        topStrengths: [],
        areasToExplore: [],
        domainSnippets: [{ category: "money", label: "Money", score: "high" }],
      },
    ];
    for (const blueprintContext of badContexts) {
      const res = await post(validBody({ blueprintContext }));
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error?: string };
      expect(typeof body.error).toBe("string");
    }
  });

  it("returns 400 when conversationId is not a string or null", async () => {
    const res = await post(validBody({ conversationId: 42 }));
    expect(res.status).toBe(400);
  });

  it("returns 200 { content } with the composed prompt for a valid request", async () => {
    const res = await post(validBody());
    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    const body = (await res.json()) as { content?: string };
    expect(body).toEqual({ content: NORMAL_REPLY });

    expect(capturedParams).toHaveLength(1);
    const { params } = capturedParams[0];
    expect(params.model).toBe("gpt-4o-mini");
    expect(params.temperature).toBe(0.3);
    const messages = params.messages as Array<{ role: string; content: string }>;
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("system");
    expect(messages[1].role).toBe("user");

    // Transcript + new message are embedded in the user message.
    const userContent = messages[1].content;
    expect(userContent).toContain("We keep arguing about money.");
    expect(userContent).toContain("How do we talk about money");
    // Compact Blueprint context only — labels and scores, nothing more.
    expect(userContent).toContain("Communication & Emotional Connection");
    expect(userContent).toContain("Money & Finances (money): 34/100");
    expect(userContent).toContain("deal-breaker threshold");
    // Minimum-context rule: the raw results/answers never appear.
    expect(userContent).not.toContain("category_results");
    expect(userContent).not.toContain("assessment_answers");
  });

  it("caps server-side history to the most recent 20 turns", async () => {
    const history = Array.from({ length: 25 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "coach") as "user" | "coach",
      content: `history-marker-${String(i).padStart(2, "0")}`,
    }));
    const res = await post(validBody({ history }));
    expect(res.status).toBe(200);

    const messages = capturedParams[0].params.messages as Array<{ role: string; content: string }>;
    const userContent = messages[1].content;
    expect(userContent).not.toContain("history-marker-00");
    expect(userContent).not.toContain("history-marker-04");
    expect(userContent).toContain("history-marker-05");
    expect(userContent).toContain("history-marker-24");
  });

  it("encodes the Sprint 8 AI safety rules in the system prompt", async () => {
    await post(validBody());
    const system = await systemPromptOfLastCall();

    // Not a therapist/doctor/lawyer/emergency service.
    expect(system).toMatch(/NOT a therapist/);
    expect(system).toMatch(/emergency service/);
    // No diagnosis / no person-labels / no predictions / no decisions.
    expect(system).toMatch(/diagnose/);
    expect(system).toMatch(/Never claim to know whether a relationship will succeed/);
    expect(system).toMatch(/Never tell the user to marry, leave, break up/);
    // Prescriptive "you should" is explicitly forbidden, not used.
    expect(system).toMatch(/never use "you should"/i);
    // Tentative decision-support framing phrases.
    expect(system).toMatch(/Based on what you've shared/);
    expect(system).toMatch(/Consider/);
    // No invented hotlines.
    expect(system).toMatch(/Never fabricate hotline numbers/);
    // Manipulation/coercion refusal rule.
    expect(system).toMatch(/manipulation/);
    expect(system).toMatch(/coercive control/);
    // Safety-first for threats/violence/abuse.
    expect(system).toMatch(/Safety first/);
  });

  it("returns the refusal content for a manipulation request", async () => {
    const res = await post(validBody({ message: "How can I manipulate my partner into staying with me?" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { content?: string };
    expect(body.content).toBe(REFUSAL_REPLY);
    expect(body.content).toMatch(/can't help with tactics/);

    // The safety rule that produced the refusal is in the system prompt.
    const system = await systemPromptOfLastCall();
    expect(system).toMatch(/manipulation, coercive control, deception, stalking/);
  });

  it("uses friend/friendship language in platonic mode", async () => {
    await post(validBody({ blueprintContext: { ...(validBody().blueprintContext as Record<string, unknown>), relationshipMode: "platonic" } }));
    const system = await systemPromptOfLastCall();
    expect(system).toMatch(/FRIENDSHIP/);
    expect(system).toMatch(/friend\/friendship language/);
  });

  it("returns 200 with a deterministic mock reply when OPENAI_API_KEY is unset", async () => {
    delete process.env.OPENAI_API_KEY;
    const res = await post(validBody());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { content?: string };
    expect(typeof body.content).toBe("string");
    expect(body.content!.length).toBeGreaterThan(20);

    // Message-derived, not a canned constant: echoes a word the user used.
    expect(body.content).toContain("money");
    // No OpenAI client was created (capturedParams stays empty).
    expect(capturedParams).toHaveLength(0);
    // Deterministic: the same input produces the same reply.
    const res2 = await post(validBody());
    const body2 = (await res2.json()) as { content?: string };
    expect(body2.content).toBe(body.content);
  });

  it("returns 200 with a deterministic mock reply when NEXT_PUBLIC_AI_MODE=mock (even with a key set)", async () => {
    process.env.NEXT_PUBLIC_AI_MODE = "mock";
    process.env.OPENAI_API_KEY = "test-key";
    const res = await post(validBody());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { content?: string };
    expect(typeof body.content).toBe("string");
    expect(body.content!.length).toBeGreaterThan(20);
    expect(capturedParams).toHaveLength(0);

    const res2 = await post(validBody());
    const body2 = (await res2.json()) as { content?: string };
    expect(body2.content).toBe(body.content);
  });

  it("returns 500 with a plain user-safe body when OpenAI fails", async () => {
    fakeMode = "throw";
    const res = await post(validBody());
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error?: string };
    expect(typeof body.error).toBe("string");
    expect(body.error).not.toContain("upstream");
    expect(body.error).not.toContain("OPENAI");
  });

  it("returns 500 when OpenAI returns an empty completion", async () => {
    fakeMode = "empty";
    const res = await post(validBody());
    expect(res.status).toBe(500);
  });

  it("accepts blueprintContext null and conversationId null", async () => {
    const res = await post(validBody({ blueprintContext: null, conversationId: null }));
    expect(res.status).toBe(200);
    const messages = capturedParams[0].params.messages as Array<{ role: string; content: string }>;
    expect(messages[1].content).not.toContain("Relationship mode:");
    expect(messages[1].content).not.toContain("Top strengths:");
  });

  it("does not write any audit or database rows (stateless)", async () => {
    // The route never imports createServiceClient directly and never
    // calls auditLog; the only side effect is the OpenAI call itself.
    await post(validBody());
    expect(capturedParams).toHaveLength(1);
    // Sanity: the response is exactly { content } — nothing else.
    const res = await post(validBody());
    const body = (await res.json()) as Record<string, unknown>;
    expect(Object.keys(body)).toEqual(["content"]);
  });
});
