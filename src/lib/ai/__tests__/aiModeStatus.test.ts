// ──────────────────────────────────────────────────────────────
// SolidGround AI — Effective AI Mode Status Unit Tests
// ──────────────────────────────────────────────────────────────
// Covers getAIModeStatus() in src/lib/ai/aiModeStatus.ts, which
// reports the server's EFFECTIVE AI mode plus the OPENAI_API_KEY
// presence signal. These tests mock the env vars — never the key
// value itself (which must not leave the server).
// The env is restored after each test (repo convention).
// Runner: `bun test`.
// ──────────────────────────────────────────────────────────────
import { describe, it, expect, afterEach } from "vitest";
import { getAIModeStatus } from "@/lib/ai/aiModeStatus";

describe("getAIModeStatus", () => {
  const key = process.env.OPENAI_API_KEY;
  const mode = process.env.NEXT_PUBLIC_AI_MODE;

  afterEach(() => {
    restore(process.env.OPENAI_API_KEY, key, "OPENAI_API_KEY");
    restore(process.env.NEXT_PUBLIC_AI_MODE, mode, "NEXT_PUBLIC_AI_MODE");
  });

  it("reports openai + key set when a key is present and mode is not mock", () => {
    process.env.OPENAI_API_KEY = "test-key";
    delete process.env.NEXT_PUBLIC_AI_MODE;
    expect(getAIModeStatus()).toEqual({ mode: "openai", openaiKeySet: true });
  });

  it("reports mock (deterministic) when NEXT_PUBLIC_AI_MODE=mock even with a key set", () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.NEXT_PUBLIC_AI_MODE = "mock";
    expect(getAIModeStatus()).toEqual({ mode: "mock", openaiKeySet: true });
  });

  it("reports mock + no key when the server key is missing (silent fallback state)", () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.NEXT_PUBLIC_AI_MODE;
    expect(getAIModeStatus()).toEqual({ mode: "mock", openaiKeySet: false });
  });

  it("reports openaiKeySet=false when the key is missing even if env mode is openai", () => {
    delete process.env.OPENAI_API_KEY;
    process.env.NEXT_PUBLIC_AI_MODE = "openai";
    expect(getAIModeStatus()).toEqual({ mode: "mock", openaiKeySet: false });
  });

  it("never exposes the key value — only the presence boolean", () => {
    process.env.OPENAI_API_KEY = "sk-super-secret-placeholder";
    delete process.env.NEXT_PUBLIC_AI_MODE;
    const result = getAIModeStatus();
    expect(result).toEqual({ mode: "openai", openaiKeySet: true });
    expect(typeof result.openaiKeySet).toBe("boolean");
    expect(JSON.stringify(result)).not.toContain("sk-super-secret");
  });
});

function restore(current: string | undefined, original: string | undefined, name: string): void {
  const keyName = name as "OPENAI_API_KEY" | "NEXT_PUBLIC_AI_MODE";
  if (original === undefined) delete process.env[keyName];
  else process.env[keyName] = original;
}
