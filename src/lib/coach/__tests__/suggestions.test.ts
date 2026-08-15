// ──────────────────────────────────────────────────────────────
// SolidGround AI — Coach Suggested Prompt Tests
// ──────────────────────────────────────────────────────────────
// The general suggestion list is deterministic, honest copy — every
// prompt is non-empty, unique, and stays within the coach's message
// length cap so a seeded send can never be rejected client-side.
// ──────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { COACH_GENERAL_SUGGESTIONS, getGeneralSuggestions } from "@/lib/coach/suggestions";
import { COACH_MESSAGE_MAX_LENGTH } from "@/lib/ai/coach-prompt";

describe("coach general suggestions", () => {
  it("returns the 7 conversation starters", () => {
    expect(getGeneralSuggestions()).toHaveLength(7);
  });

  it("is deterministic", () => {
    expect(getGeneralSuggestions()).toEqual(COACH_GENERAL_SUGGESTIONS);
  });

  it("has unique ids and non-empty prompts", () => {
    const ids = new Set(COACH_GENERAL_SUGGESTIONS.map((s) => s.id));
    expect(ids.size).toBe(COACH_GENERAL_SUGGESTIONS.length);
    for (const suggestion of COACH_GENERAL_SUGGESTIONS) {
      expect(suggestion.prompt.trim().length).toBeGreaterThan(0);
    }
  });

  it("keeps every prompt under the server message length cap", () => {
    for (const suggestion of COACH_GENERAL_SUGGESTIONS) {
      expect(suggestion.prompt.length).toBeLessThanOrEqual(COACH_MESSAGE_MAX_LENGTH);
    }
  });
});
