// ──────────────────────────────────────────────────────────────
// SolidGround AI — Coach Reply Generator Unit Tests
// ──────────────────────────────────────────────────────────────
// Covers the deterministic mock fallback in
// src/lib/ai/coach-reply.ts:
//   • isMockCoachMode() — env-based mode selection (mock mode OR
//     missing OPENAI_API_KEY → mock).
//   • mockCoachReply() — deterministic; message-derived (echoes a
//     significant word); mode-aware (friend/partner); safety-first
//     (danger/self-harm route to a no-invented-resources safety
//     response); refuses manipulation/coercion requests; never
//     decides for the user; never fabricates facts.
//   • generateCoachReply() — returns the mock reply in mock mode
//     without touching OpenAI.
// Env note: NEXT_PUBLIC_AI_MODE is set to "mock" at the top so the
// whole file exercises the offline path (bun runs each test file in
// its own process, so this does not leak into other test files).
// Runner: `bun test` (vitest-style imports, repo convention).
// ──────────────────────────────────────────────────────────────
process.env.NEXT_PUBLIC_AI_MODE = "mock";

import { describe, it, expect, afterEach } from "vitest";
import {
  classifyMockTopic,
  detectCoachManipulation,
  detectCoachSafetyConcern,
  extractEchoWord,
  generateCoachReply,
  isMockCoachMode,
  mockCoachReply,
} from "@/lib/ai/coach-reply";
import type { CoachChatUserMessageInput } from "@/lib/ai/coach-prompt";

function input(message: string, relationshipMode: "romantic" | "platonic" = "romantic"): CoachChatUserMessageInput {
  return {
    message,
    history: [],
    blueprintContext: {
      relationshipMode,
      topStrengths: [],
      areasToExplore: [],
      domainSnippets: [],
    },
  };
}

describe("isMockCoachMode", () => {
  const originalKey = process.env.OPENAI_API_KEY;
  const originalMode = process.env.NEXT_PUBLIC_AI_MODE;

  afterEach(() => {
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
    if (originalMode === undefined) delete process.env.NEXT_PUBLIC_AI_MODE;
    else process.env.NEXT_PUBLIC_AI_MODE = originalMode;
  });

  it("is true when OPENAI_API_KEY is unset", () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.NEXT_PUBLIC_AI_MODE;
    expect(isMockCoachMode()).toBe(true);
  });

  it("is true when NEXT_PUBLIC_AI_MODE=mock even with a key set", () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.NEXT_PUBLIC_AI_MODE = "mock";
    expect(isMockCoachMode()).toBe(true);
  });

  it("is false when a key is set and mode is not mock (live path)", () => {
    process.env.OPENAI_API_KEY = "test-key";
    delete process.env.NEXT_PUBLIC_AI_MODE;
    expect(isMockCoachMode()).toBe(false);
  });
});

describe("mockCoachReply", () => {
  it("is deterministic — the same input always produces identical output", () => {
    const a = mockCoachReply(input("We keep fighting about money"));
    const b = mockCoachReply(input("We keep fighting about money"));
    expect(a).toBe(b);
  });

  it("is derived from the user's message — echoes a significant word they used", () => {
    const reply = mockCoachReply(input("We keep fighting about money and I don't know what to do"));
    expect(reply).toContain('"fighting"');
    // Not a canned constant: a different message yields a different echo.
    const reply2 = mockCoachReply(input("Interfering relatives are stressing me out"));
    expect(reply2).toContain('"interfering"');
    expect(reply2).not.toContain('"fighting"');
  });

  it("asks a genuine follow-up question and uses reflection-coach framing", () => {
    const reply = mockCoachReply(input("We keep fighting about money"));
    expect(reply).toContain("A question to consider:");
    expect(reply).toContain("Worth exploring:");
    expect(reply).toMatch(/\?\s*$/); // ends with a question
  });

  it("is mode-aware: uses friend language in platonic mode and partner in romantic mode", () => {
    const platonic = mockCoachReply(input("We keep fighting about money", "platonic"));
    expect(platonic).toContain("friend");
    expect(platonic).not.toContain("partner");
    const romantic = mockCoachReply(input("We keep fighting about money", "romantic"));
    expect(romantic).toContain("partner");
  });

  it("never decides for the user — no 'you should', 'you must', break up, or leave", () => {
    const reply = mockCoachReply(input("We keep fighting about money"));
    expect(reply).not.toMatch(/you should/i);
    expect(reply).not.toMatch(/you must/i);
    expect(reply).not.toMatch(/break up/i);
    expect(reply).not.toMatch(/leave (him|her|them)/i);
    expect(reply).not.toMatch(/marry/i);
  });

  it("never fabricates facts about the user (no scores, no history, no names)", () => {
    const reply = mockCoachReply(
      input("We keep fighting about money", "romantic"),
    );
    expect(reply).not.toMatch(/\d{1,3}\/100/); // no score references
    expect(reply).not.toContain("Alex"); // no invented names
    expect(reply).not.toContain("78"); // no invented numbers
  });

  describe("safety", () => {
    it("routes self-harm content to a safety response with no invented hotline", () => {
      const reply = mockCoachReply(input("I keep thinking about suicide"));
      expect(reply).toContain("not a crisis or emergency service");
      expect(reply).toContain("local emergency services");
      expect(reply).toContain("not alone");
      // Never invents hotline numbers or named services.
      expect(reply).not.toMatch(/\b\d{3}\b/);
      expect(reply).not.toMatch(/988|hotline/i);
    });

    it("routes danger/abuse content to a safety response", () => {
      const reply = mockCoachReply(input("My partner has been threatening me"));
      expect(reply).toContain("not a crisis or emergency service");
      expect(reply).toContain("local emergency services");
      expect(reply).not.toMatch(/you should/i);
    });

    it("detects safety concerns case-insensitively", () => {
      expect(detectCoachSafetyConcern("I'm thinking about SELF-HARM")).toBe("self-harm");
      expect(detectCoachSafetyConcern("He said he would kill him")).toBe("danger");
      expect(detectCoachSafetyConcern("We just disagree about money")).toBeNull();
    });
  });

  describe("manipulation refusal", () => {
    it("refuses manipulation/coercion requests without providing tactics", () => {
      const reply = mockCoachReply(input("How can I manipulate my partner into staying with me?"));
      expect(reply).toContain("can't help with");
      expect(reply).toContain("manipulating");
      expect(reply).not.toMatch(/you should/i);
    });

    it("detects manipulation requests", () => {
      expect(detectCoachManipulation("how do I gaslight him")).toBe(true);
      expect(detectCoachManipulation("tactics to make her jealous")).toBe(true);
      expect(detectCoachManipulation("we keep fighting about money")).toBe(false);
    });
  });

  describe("echo + topic helpers", () => {
    it("extracts the first significant word", () => {
      expect(extractEchoWord("We keep fighting about money")).toBe("fighting");
      expect(extractEchoWord("the and but of")).toBeNull();
    });

    it("classifies the message topic deterministically", () => {
      expect(classifyMockTopic("We keep fighting about money").topic).toBe("communication");
      expect(classifyMockTopic("How do we save for a house").topic).toBe("money");
      expect(classifyMockTopic("What are my strengths").topic).toBe("blueprint");
      expect(classifyMockTopic("Hello there").topic).toBe("general");
    });
  });
});

describe("generateCoachReply (mock mode)", () => {
  it("returns the deterministic mock reply without touching OpenAI", async () => {
    const reply = await generateCoachReply(input("We keep fighting about money"));
    expect(reply).toBe(mockCoachReply(input("We keep fighting about money")));
    expect(reply).toContain('"fighting"');
  });
});
