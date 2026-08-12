// ──────────────────────────────────────────────────────────────
// SolidGround AI — pairingIsBlocked helper unit tests
// ──────────────────────────────────────────────────────────────
// Covers src/lib/pairings/blocked.ts:
//   • true  — RPC returns true (block exists, either direction)
//   • false — RPC returns false (no block)
//   • THROWS on RPC error (fail closed — a helper failure must never
//     silently become "not blocked")
//   • passes the pairing id as target_pairing_id (migration 036
//     signature: pairing_is_blocked(target_pairing_id uuid))
// Runner: `bun test` (the repo's suite; vitest-style imports).
// ──────────────────────────────────────────────────────────────
import { describe, it, expect } from "vitest";
import { pairingIsBlocked } from "../blocked";

type RpcResult = { data?: unknown; error?: { message: string } | null };

/** Record of rpc calls so tests can assert the arguments. */
const rpcCalls: Array<{ fn: string; args: Record<string, unknown> }> = [];

function fakeServiceClient(result: RpcResult) {
  return {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn, args });
      if (result.error) return { data: null, error: result.error };
      return { data: result.data ?? null, error: null };
    },
  } as never;
}

describe("pairingIsBlocked", () => {
  it("returns true when the RPC reports a block", async () => {
    const blocked = await pairingIsBlocked(fakeServiceClient({ data: true }), "pairing-1");
    expect(blocked).toBe(true);
  });

  it("returns false when the RPC reports no block", async () => {
    const blocked = await pairingIsBlocked(fakeServiceClient({ data: false }), "pairing-1");
    expect(blocked).toBe(false);
  });

  it("treats a non-boolean truthy return as false (only exact true counts)", async () => {
    // Defensive: the RPC returns boolean; anything else must not unlock.
    const blocked = await pairingIsBlocked(fakeServiceClient({ data: 1 }), "pairing-1");
    expect(blocked).toBe(false);
  });

  it("calls the migration-036 function with the pairing id", async () => {
    rpcCalls.length = 0;
    await pairingIsBlocked(fakeServiceClient({ data: false }), "pairing-abc");
    expect(rpcCalls).toHaveLength(1);
    expect(rpcCalls[0].fn).toBe("pairing_is_blocked");
    expect(rpcCalls[0].args).toEqual({ target_pairing_id: "pairing-abc" });
  });

  it("throws (fail closed) when the RPC errors", async () => {
    await expect(
      pairingIsBlocked(fakeServiceClient({ error: { message: "rpc exploded" } }), "pairing-1"),
    ).rejects.toThrow(/pairing_is_blocked RPC failed/);
  });
});
