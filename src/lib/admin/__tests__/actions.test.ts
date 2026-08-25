// ──────────────────────────────────────────────────────────────
// SolidGround AI — Admin Sanitizer Tests
// ──────────────────────────────────────────────────────────────
// Exercises sanitizeUserSearch: the PostgREST `.or()` filter-string
// sanitizer applied to the admin user-search term. PostgREST builds a raw
// filter string for `.or()` where `% , . ( ) * !` all carry syntax meaning,
// so the sanitizer must strip them (names never need them) and cap the
// length — while preserving real name characters like spaces.
// ──────────────────────────────────────────────────────────────
import { describe, it, expect } from "vitest";
import { sanitizeUserSearch } from "@/lib/admin/actions";

const FORBIDDEN = /[%,.()*!]/;

describe("sanitizeUserSearch", () => {
  it("returns plain names unchanged", () => {
    expect(sanitizeUserSearch("Alice")).toBe("Alice");
    expect(sanitizeUserSearch("Jane Doe")).toBe("Jane Doe");
    expect(sanitizeUserSearch("O'Brien")).toBe("O'Brien");
  });

  it("strips the PostgREST wildcard character", () => {
    expect(sanitizeUserSearch("%")).toBe("");
    expect(sanitizeUserSearch("a%")).toBe("a");
    expect(sanitizeUserSearch("%co")).toBe("co");
  });

  it("strips every filter-syntax character", () => {
    expect(sanitizeUserSearch("a,b(ma)in*")).toBe("abmain");
    expect(sanitizeUserSearch("john.doe!")).toBe("johndoe");
    expect(sanitizeUserSearch("%.()*!%")).toBe("");
  });

  it("never emits a filter-syntax character", () => {
    const inputs = ["%", ",", ".", "(", ")", "*", "!", "%a,b.c(d)e*f!g%"];
    for (const input of inputs) {
      expect(FORBIDDEN.test(sanitizeUserSearch(input))).toBe(false);
    }
  });

  it("caps the length at 100 characters", () => {
    const long = "A".repeat(250);
    expect(sanitizeUserSearch(long).length).toBe(100);
    expect(sanitizeUserSearch(long)).toBe("A".repeat(100));
  });

  it("trims surrounding whitespace but keeps inner spaces", () => {
    expect(sanitizeUserSearch("  Alice  ")).toBe("Alice");
    expect(sanitizeUserSearch("  ")).toBe("");
    expect(sanitizeUserSearch("Mary  Jane")).toBe("Mary  Jane");
  });
});