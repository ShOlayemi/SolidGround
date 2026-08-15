// ──────────────────────────────────────────────────────────────
// SolidGround AI — isPartnerDeletedPairing tests (Sprint 8 live-test fix)
// ──────────────────────────────────────────────────────────────
import { describe, expect, it } from "vitest";
import { isPartnerDeletedPairing } from "../pairingDeleted";

describe("isPartnerDeletedPairing", () => {
  it("is true for a completed pairing whose invitee was deleted (invitee_user_id SET NULL)", () => {
    expect(
      isPartnerDeletedPairing({ status: "completed", invitee_user_id: null })
    ).toBe(true);
  });

  it("is true for an accepted pairing whose invitee was deleted", () => {
    expect(
      isPartnerDeletedPairing({ status: "accepted", invitee_user_id: null })
    ).toBe(true);
  });

  it("is false for a pending pairing with no invitee yet (normal pre-accept state)", () => {
    // invitee_user_id is NULL until accept by design — NOT a deletion.
    expect(
      isPartnerDeletedPairing({ status: "pending", invitee_user_id: null })
    ).toBe(false);
  });

  it("is false for any pairing that still has an invitee", () => {
    expect(
      isPartnerDeletedPairing({
        status: "completed",
        invitee_user_id: "user-b",
      })
    ).toBe(false);
    expect(
      isPartnerDeletedPairing({ status: "accepted", invitee_user_id: "user-b" })
    ).toBe(false);
  });
});
