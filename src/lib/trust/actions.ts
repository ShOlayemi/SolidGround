"use server";
// ──────────────────────────────────────────────────────────────
// SolidGround AI — Trust & Safety data layer (web)
// ──────────────────────────────────────────────────────────────
// Server actions over the SHARED Supabase schema (migration 036):
//   - blocked_users  — block / unblock / list (RLS: blocker_user_id = me)
//   - reports        — submit a safety report (RLS: reporter_user_id = me;
//                       no user UPDATE/DELETE — moderation is service-role)
//
// Mirrors the mobile app's services/trust data layer 1:1, but as Next.js
// server actions in the style of src/lib/journey/actions.ts and
// src/lib/pairings/actions.ts:
//   - Every action validates the current user via createClient() +
//     auth.getUser() and returns plain serializable
//     { ok: true } / { ok: false, error } results — no thrown raw DB errors.
//   - `blocker_user_id` / `reporter_user_id` ALWAYS derive from the session,
//     never from a caller-supplied argument (Sprint 8 §22).
//   - Ownership scoping is enforced by RLS; the actions still carry the
//     explicit blocker_user_id/reporter_user_id filters (defensive, keeps
//     the guard testable against the in-memory mock).
//
// Blocking is DB-enforced (migration 036 §2/§6): once a block exists in
// EITHER direction the two users can no longer see/update the shared
// pairing, and downstream "via the pairing" tables hide automatically.
// The report categories are the migration-036 CHECK values verbatim
// (harassment | inappropriate | unsafe | privacy | ai | other) — the values
// are the API contract, the labels live in ./copy.ts.
// ──────────────────────────────────────────────────────────────
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// ── Types ─────────────────────────────────────────────────────
/** The six report categories — migration-036 CHECK constraint verbatim. */
export type ReportCategory =
  | "harassment"
  | "inappropriate"
  | "unsafe"
  | "privacy"
  | "ai"
  | "other";

/** A blocked user as surfaced to the UI (blocker's own row + display name). */
export interface BlockedUser {
  /** blocked_users.id — the row id (used by the unblock action). */
  id: string;
  /** The blocked user's profiles.id. */
  blockedUserId: string;
  /** The blocked user's display name (fallback: full_name / "Unknown"). */
  displayName: string;
  createdAt: string;
}

/** Plain serializable result for side-effect-only actions. */
export type TrustOk = { ok: true } | { ok: false; error: string };

type AuthResult =
  | { success: true; userId: string; supabase: SupabaseClient }
  | { success: false; error: string };

/** Report description cap — matches the reflection/goal text limit (2000). */
const REPORT_DESCRIPTION_MAX = 2000;

// ── Auth helper ───────────────────────────────────────────────
/**
 * Returns the authenticated user id, ALWAYS derived from the session via
 * createClient() + auth.getUser() — never from a caller-supplied argument.
 */
async function requireUserId(): Promise<AuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return { success: false, error: "Not authenticated." };
  }
  return { success: true, userId: user.id, supabase };
}

/** Plain-language display name from a profile row (repo convention). */
function displayNameOf(row: { display_name: string | null; full_name: string | null } | null) {
  return row?.display_name ?? row?.full_name ?? "Unknown";
}

// ── Blocking ──────────────────────────────────────────────────
/**
 * Block a user. INSERTs a blocked_users row with blocker_user_id = the
 * SESSION user (never caller-supplied). Cannot block yourself. An already-
 * existing block (UNIQUE) is treated as success — the outcome the user
 * wants is already in place.
 */
export async function blockUser(blockedUserId: string): Promise<TrustOk> {
  if (typeof blockedUserId !== "string" || blockedUserId.trim().length === 0) {
    return { ok: false, error: "Choose someone to block." };
  }
  const auth = await requireUserId();
  if (!auth.success) return { ok: false, error: auth.error };
  const { userId, supabase } = auth;
  const target = blockedUserId.trim();

  if (target === userId) {
    return { ok: false, error: "You can't block yourself." };
  }

  const { error } = await supabase
    .from("blocked_users")
    .insert({ blocker_user_id: userId, blocked_user_id: target });
  if (error) {
    // DB rejects self-blocks (CHECK) and duplicate pairs (UNIQUE) — map the
    // duplicate to success and everything else to a friendly message.
    const code = String((error as { code?: string }).code ?? "").toLowerCase();
    const message = String((error as { message?: string }).message ?? "").toLowerCase();
    if (code.includes("23505") || message.includes("duplicate")) {
      return { ok: true };
    }
    if (message.includes("check constraint") || message.includes("cannot block")) {
      return { ok: false, error: "You can't block yourself." };
    }
    return { ok: false, error: "Something went wrong. Please try again." };
  }
  return { ok: true };
}

/**
 * Unblock a user by their blocked_users ROW id. The DELETE is scoped to the
 * session user's OWN rows (.eq("id", rowId) + .eq("blocker_user_id", me)).
 */
export async function unblockUser(rowId: string): Promise<TrustOk> {
  if (typeof rowId !== "string" || rowId.trim().length === 0) {
    return { ok: false, error: "Choose a block to remove." };
  }
  const auth = await requireUserId();
  if (!auth.success) return { ok: false, error: auth.error };
  const { userId, supabase } = auth;
  const id = rowId.trim();

  const { error } = await supabase
    .from("blocked_users")
    .delete()
    .eq("id", id)
    .eq("blocker_user_id", userId);
  if (error) {
    return { ok: false, error: "Something went wrong. Please try again." };
  }
  return { ok: true };
}

/**
 * The current user's blocked list, newest first, with each blocked user's
 * display name. Own rows come from the session client (RLS: blocker_user_id
 * = me); display names are read via the service client because profiles RLS
 * only lets a user read their OWN profile (same pattern as pairings).
 */
export async function listBlockedUsers(): Promise<BlockedUser[]> {
  const auth = await requireUserId();
  if (!auth.success) return [];
  const { userId, supabase } = auth;

  const { data, error } = await supabase
    .from("blocked_users")
    .select("id, blocked_user_id, created_at")
    .eq("blocker_user_id", userId)
    .order("created_at", { ascending: false });
  if (error) return [];

  const rows = data ?? [];
  const ids = rows.map((r) => (r as { blocked_user_id: string }).blocked_user_id);
  const nameById = new Map<string, string>();
  if (ids.length > 0) {
    const service = await createServiceClient();
    const { data: profiles } = await service
      .from("profiles")
      .select("id, display_name, full_name")
      .in("id", ids);
    for (const p of profiles ?? []) {
      nameById.set((p as { id: string }).id, displayNameOf(p as never));
    }
  }

  return rows.map((r) => {
    const row = r as { id: string; blocked_user_id: string; created_at: string };
    return {
      id: row.id,
      blockedUserId: row.blocked_user_id,
      displayName: nameById.get(row.blocked_user_id) ?? "Unknown",
      createdAt: row.created_at,
    };
  });
}

// ── Reporting ─────────────────────────────────────────────────
/**
 * Submit a safety report. INSERTs a reports row with reporter_user_id = the
 * SESSION user (never caller-supplied); status defaults to 'open' and
 * reported_user_id is nullable (some reports concern AI output). The reason
 * must be one of the six migration-036 values and details are capped.
 */
export async function reportUser(input: {
  reportedUserId: string | null;
  reason: ReportCategory;
  details?: string;
}): Promise<TrustOk> {
  if (!["harassment", "inappropriate", "unsafe", "privacy", "ai", "other"].includes(input.reason)) {
    return { ok: false, error: "Choose a reason for the report." };
  }
  const details = (input.details ?? "").trim();
  if (details.length > REPORT_DESCRIPTION_MAX) {
    return { ok: false, error: `Please keep the report under ${REPORT_DESCRIPTION_MAX} characters.` };
  }
  const auth = await requireUserId();
  if (!auth.success) return { ok: false, error: auth.error };
  const { userId, supabase } = auth;

  const { error } = await supabase.from("reports").insert({
    reporter_user_id: userId,
    reported_user_id: input.reportedUserId?.trim() || null,
    category: input.reason,
    description: details.length > 0 ? details : null,
  });
  if (error) {
    return { ok: false, error: "Something went wrong. Please try again." };
  }
  return { ok: true };
}
