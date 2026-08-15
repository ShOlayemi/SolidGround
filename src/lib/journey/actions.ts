"use server";

// ──────────────────────────────────────────────────────────────
// SolidGround AI — Journey Data-Layer Server Actions
// ──────────────────────────────────────────────────────────────
// The Journey is the post-pairing growth layer: conversation topics +
// shared agreements + shared goals + private reflections, over the shared
// Supabase schema (migrations 035 + 036 — tables already exist, RLS
// already correct). Mirrors the mobile services
// (services/journey/journeyService.ts, services/agreements/) 1:1, but as
// Next.js server actions in the style of src/lib/coach/actions.ts and
// src/lib/pairings/actions.ts:
//
//  - Every action validates the current user via createClient() +
//    auth.getUser() and returns plain serializable
//    { ok: true, data } / { ok: false, error } results — no thrown raw
//    DB errors.
//  - Ownership/participant scoping is enforced by RLS (the shared schema's
//    policies), NOT hand-written here: topics/goals/agreements are
//    participant-scoped via the pairing, reflections are owner-scoped via
//    user_id. The actions still carry the explicit user_id/pairing_id
//    filters the mobile service uses (defensive; keeps the guard testable
//    against the in-memory mock).
//  - Journey is FREE (owner decision): no premium gating.
//
// Owner decisions baked in:
//  1. The Journey is scoped to the user's MOST RECENT accepted/active/
//     completed pairing, resolved inside getJourneyDashboard. No pairing →
//     { hasPairing: false } sentinel.
//  2. ensureTopicsFromReport refreshes EXISTING topics via plain UPDATE by
//     id (category_name + prompts only) — NEVER an upsert. The table's
//     INSERT policy has WITH CHECK (created_by = auth.uid()); an upsert
//     would evaluate the INSERT side with created_by = NULL and fail with
//     42501 (the mobile live bug). New topics INSERT with created_by =
//     auth.uid(). Stale topics are NOT deleted (no DELETE policy; they die
//     via pairing CASCADE).
// ──────────────────────────────────────────────────────────────

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { ConversationGuide, PairingStatus } from "@/types";
import { planTopicSync } from "./sync";
import type {
  AgreementStatus,
  CreateAgreementInput,
  CreateGoalInput,
  CreateReflectionInput,
  GoalStatus,
  JourneyCounts,
  JourneyDashboard,
  JourneyTopic,
  PrivateReflection,
  PrivateReflectionRow,
  RelationshipTopicRow,
  SharedAgreement,
  SharedAgreementRow,
  SharedGoal,
  SharedGoalRow,
  TopicStatus,
  UpdateAgreementInput,
  UpdateGoalInput,
  UpdateReflectionInput,
} from "./types";

// ── Types ─────────────────────────────────────────────────────

/** Plain serializable action result for data-bearing actions. */
export type JourneyResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** Plain serializable action result for side-effect-only actions. */
export type JourneyOk = { ok: true } | { ok: false; error: string };

type AuthResult =
  | { success: true; userId: string; supabase: SupabaseClient }
  | { success: false; error: string };

// ── Constants ─────────────────────────────────────────────────

/** Explicit column lists (repo audit convention — never select('*')). */
const TOPIC_SELECT =
  "id, pairing_id, category_id, category_name, topic, prompts, status, created_by, created_at, updated_at";
const GOAL_SELECT =
  "id, pairing_id, created_by, title, description, domain, target_date, status, created_at, updated_at";
const AGREEMENT_SELECT =
  "id, pairing_id, created_by, title, description, domain, status, created_at, updated_at";
const REFLECTION_SELECT =
  "id, user_id, pairing_id, topic_id, category_id, content, created_at, updated_at";

const TOPIC_STATUSES: readonly TopicStatus[] = ["not_started", "discussed"];
const GOAL_STATUSES: readonly GoalStatus[] = ["not_started", "in_progress", "completed"];
const AGREEMENT_STATUSES: readonly AgreementStatus[] = ["pending", "agreed"];

/**
 * Pairing statuses that count as "active" for the Journey (the web pairing
 * model). The newest such pairing is the Journey's scope.
 */
const ACTIVE_PAIRING_STATUSES: readonly PairingStatus[] = ["accepted", "active", "completed"];

/** Reflection length cap — matches the Blueprint text-answer limit (2000). */
const REFLECTION_MAX_LENGTH = 2000;

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

// ── Parsing helpers (defensive — PostgREST may return JSONB as string) ──

/** Parses a JSONB string[] column, tolerating stringified payloads. */
function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === "string");
      }
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Parses the comparison_reports.conversation_guides JSONB column into
 * ConversationGuide objects, dropping any malformed entries defensively.
 * Returns null when there is no report row at all.
 */
function parseGuides(value: unknown): ConversationGuide[] | null {
  if (value === null || value === undefined) return null;
  let raw: unknown = value;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }
  if (!Array.isArray(raw)) return null;
  const guides: ConversationGuide[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const g = item as Record<string, unknown>;
    if (
      typeof g.categoryId !== "string" ||
      typeof g.categoryName !== "string" ||
      typeof g.topic !== "string" ||
      !Array.isArray(g.prompts)
    ) {
      continue;
    }
    guides.push({
      categoryId: g.categoryId,
      categoryName: g.categoryName,
      topic: g.topic,
      prompts: g.prompts.filter((p): p is string => typeof p === "string"),
    });
  }
  return guides;
}

// ── Row → domain mappers ──────────────────────────────────────

function toJourneyTopic(row: RelationshipTopicRow): JourneyTopic {
  return {
    id: row.id,
    categoryId: row.category_id,
    categoryName: row.category_name,
    topic: row.topic,
    prompts: parseStringArray(row.prompts),
    status: row.status,
  };
}

function toSharedGoal(row: SharedGoalRow): SharedGoal {
  return {
    id: row.id,
    pairingId: row.pairing_id,
    createdBy: row.created_by,
    title: row.title,
    description: row.description,
    domain: row.domain,
    targetDate: row.target_date,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSharedAgreement(row: SharedAgreementRow): SharedAgreement {
  return {
    id: row.id,
    pairingId: row.pairing_id,
    createdBy: row.created_by,
    title: row.title,
    description: row.description,
    domain: row.domain,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toPrivateReflection(row: PrivateReflectionRow): PrivateReflection {
  return {
    id: row.id,
    pairingId: row.pairing_id,
    topicId: row.topic_id,
    categoryId: row.category_id,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── Core helpers (shared by public actions + the dashboard aggregate) ──

/** Loads the pairing's conversation guides from the latest report (null = no report). */
async function loadReportGuides(
  supabase: SupabaseClient,
  pairingId: string,
): Promise<ConversationGuide[] | null> {
  const { data: row, error } = await supabase
    .from("comparison_reports")
    .select("conversation_guides")
    .eq("pairing_id", pairingId)
    .maybeSingle();
  if (error) {
    console.error("[journey] failed to load comparison report:", error.message);
    return null;
  }
  if (!row) return null;
  return parseGuides(row.conversation_guides);
}

/**
 * Reconcile relationship_topics rows with the pairing's CURRENT report
 * guides (RLS: participants). Missing guides are INSERTed (status
 * 'not_started', created_by = session user); matching rows have ONLY
 * category_name/prompts refreshed via plain UPDATE by id — status
 * ("Discussed") and created_by survive (see module header for the 42501
 * upsert bug). Stale rows are NOT deleted (no DELETE policy). No-op when
 * `guides` is null (no report yet — the Journey UI gates on report
 * existence).
 */
async function syncTopicsFromReport(
  supabase: SupabaseClient,
  userId: string,
  pairingId: string,
  guides: ConversationGuide[] | null,
): Promise<JourneyOk> {
  if (guides === null) return { ok: true };

  const { data: rows, error: listError } = await supabase
    .from("relationship_topics")
    .select(TOPIC_SELECT)
    .eq("pairing_id", pairingId);
  if (listError) {
    console.error("[journey] failed to list topics for sync:", listError.message);
    return { ok: false, error: "Failed to load your journey topics." };
  }

  const plan = planTopicSync(pairingId, (rows ?? []) as RelationshipTopicRow[], guides);

  // 1. Insert missing topics (status 'not_started', created_by = session user).
  if (plan.toInsert.length > 0) {
    const payloads = plan.toInsert.map((row) => ({ ...row, created_by: userId }));
    const { error: insertError } = await supabase.from("relationship_topics").insert(payloads);
    if (insertError) {
      console.error("[journey] failed to insert topics:", insertError.message);
      return { ok: false, error: "Failed to save your journey topics." };
    }
  }

  // 2. Refresh existing topics — plain UPDATE by id, category_name + prompts
  //    only. NEVER an upsert (INSERT-side WITH CHECK on created_by would
  //    fail with 42501); status and created_by stay untouched.
  for (const row of plan.toUpdate) {
    const { error: updateError } = await supabase
      .from("relationship_topics")
      .update({ category_name: row.category_name, prompts: row.prompts })
      .eq("id", row.id);
    if (updateError) {
      console.error("[journey] failed to refresh topic:", updateError.message);
      return { ok: false, error: "Failed to refresh your journey topics." };
    }
  }

  // 3. plan.toDelete (stale rows) is deliberately NOT executed — migration
  //    035 defines no DELETE policy on relationship_topics; the stale rows
  //    are inert and die via pairing CASCADE.
  return { ok: true };
}

/** Resolve the user's most recent accepted/active/completed pairing. */
async function resolveActivePairing(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ ok: true; pairingId: string } | { ok: false; error: string } | { ok: true; pairingId: null }> {
  const { data: pairing, error } = await supabase
    .from("pairings")
    .select("id")
    .or(`inviter_user_id.eq.${userId},invitee_user_id.eq.${userId}`)
    .in("status", [...ACTIVE_PAIRING_STATUSES])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[journey] failed to resolve active pairing:", error.message);
    return { ok: false, error: "Failed to load your pairing." };
  }
  if (!pairing) return { ok: true, pairingId: null };
  return { ok: true, pairingId: pairing.id as string };
}

async function listTopicsCore(supabase: SupabaseClient, pairingId: string): Promise<JourneyTopic[]> {
  const { data, error } = await supabase
    .from("relationship_topics")
    .select(TOPIC_SELECT)
    .eq("pairing_id", pairingId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[journey] failed to list topics:", error.message);
    return [];
  }
  return ((data ?? []) as RelationshipTopicRow[]).map(toJourneyTopic);
}

async function listGoalsCore(supabase: SupabaseClient, pairingId: string): Promise<SharedGoal[]> {
  const { data, error } = await supabase
    .from("shared_goals")
    .select(GOAL_SELECT)
    .eq("pairing_id", pairingId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[journey] failed to list goals:", error.message);
    return [];
  }
  return ((data ?? []) as SharedGoalRow[]).map(toSharedGoal);
}

async function listAgreementsCore(
  supabase: SupabaseClient,
  pairingId: string,
): Promise<SharedAgreement[]> {
  const { data, error } = await supabase
    .from("shared_agreements")
    .select(AGREEMENT_SELECT)
    .eq("pairing_id", pairingId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[journey] failed to list agreements:", error.message);
    return [];
  }
  return ((data ?? []) as SharedAgreementRow[]).map(toSharedAgreement);
}

/** My private reflections across ALL pairings (owner-only: user_id filter). */
async function listReflectionsCore(supabase: SupabaseClient, userId: string): Promise<PrivateReflection[]> {
  const { data, error } = await supabase
    .from("private_reflections")
    .select(REFLECTION_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[journey] failed to list reflections:", error.message);
    return [];
  }
  return ((data ?? []) as PrivateReflectionRow[]).map(toPrivateReflection);
}

/** Persisted journey counts — REAL counts only, no invented percentages. */
async function countsCore(
  supabase: SupabaseClient,
  pairingId: string,
  guides: ConversationGuide[] | null,
): Promise<JourneyResult<JourneyCounts>> {
  const topicsTotal = guides?.length ?? 0;

  const { count: discussedCount, error: discussedError } = await supabase
    .from("relationship_topics")
    .select("id", { count: "exact", head: true })
    .eq("pairing_id", pairingId)
    .eq("status", "discussed");
  if (discussedError) {
    console.error("[journey] failed to count discussed topics:", discussedError.message);
    return { ok: false, error: "Failed to load your journey progress." };
  }

  const goals = await listGoalsCore(supabase, pairingId);
  let goalsActive = 0;
  let goalsCompleted = 0;
  for (const goal of goals) {
    if (goal.status === "completed") {
      goalsCompleted += 1;
    } else {
      goalsActive += 1;
    }
  }

  return {
    ok: true,
    data: { topicsTotal, topicsDiscussed: discussedCount ?? 0, goalsActive, goalsCompleted },
  };
}

// ── Server Actions ────────────────────────────────────────────

/**
 * The Journey dashboard aggregate, scoped to the user's MOST RECENT
 * accepted/active/completed pairing (owner decision). Returns
 * { hasPairing: false } when the user has none, so the UI can show an
 * empty state. Otherwise: loads the pairing's latest report guides,
 * materializes relationship_topics from them (ensureTopicsFromReport),
 * then returns topics + goals + agreements + reflections + counts.
 */
export async function getJourneyDashboard(): Promise<JourneyResult<JourneyDashboard>> {
  const auth = await requireUserId();
  if (!auth.success) return { ok: false, error: auth.error };
  const { supabase, userId } = auth;

  const pairing = await resolveActivePairing(supabase, userId);
  if (!pairing.ok) return { ok: false, error: pairing.error };
  if (pairing.pairingId === null) return { ok: true, data: { hasPairing: false } };
  const pairingId = pairing.pairingId;

  const guides = await loadReportGuides(supabase, pairingId);

  const sync = await syncTopicsFromReport(supabase, userId, pairingId, guides);
  if (!sync.ok) return sync;

  const topics = await listTopicsCore(supabase, pairingId);
  const goals = await listGoalsCore(supabase, pairingId);
  const agreements = await listAgreementsCore(supabase, pairingId);
  const reflections = await listReflectionsCore(supabase, userId);

  const counts = await countsCore(supabase, pairingId, guides);
  if (!counts.ok) return counts;

  return {
    ok: true,
    data: {
      hasPairing: true,
      pairingId,
      topics,
      goals,
      agreements,
      reflections,
      counts: counts.data,
    },
  };
}

/**
 * Materialize relationship_topics rows from the pairing's latest
 * comparison_reports.conversation_guides (idempotent). Missing guides are
 * INSERTed (status 'not_started', created_by = session user); matching rows
 * are refreshed via plain UPDATE by id (category_name + prompts only — a
 * "Discussed" status survives). Stale rows are NOT deleted (no DELETE
 * policy; they die via pairing CASCADE). No-op when the pairing has no
 * report yet.
 */
export async function ensureTopicsFromReport(pairingId: string): Promise<JourneyOk> {
  const auth = await requireUserId();
  if (!auth.success) return { ok: false, error: auth.error };
  const { supabase, userId } = auth;

  const guides = await loadReportGuides(supabase, pairingId);
  return syncTopicsFromReport(supabase, userId, pairingId, guides);
}

/** Persisted journey topics for a pairing, in report order (participants may read). */
export async function listTopics(pairingId: string): Promise<JourneyResult<JourneyTopic[]>> {
  const auth = await requireUserId();
  if (!auth.success) return { ok: false, error: auth.error };
  return { ok: true, data: await listTopicsCore(auth.supabase, pairingId) };
}

/**
 * One persisted journey topic by row id, or null when it does not exist
 * (or RLS hides it — the caller is not a participant). The UI receives the
 * relationship_topics row id via the topic-detail route and needs both the
 * content AND the row id to update status.
 */
export async function getTopic(topicId: string): Promise<JourneyResult<JourneyTopic | null>> {
  const auth = await requireUserId();
  if (!auth.success) return { ok: false, error: auth.error };

  const { data, error } = await auth.supabase
    .from("relationship_topics")
    .select(TOPIC_SELECT)
    .eq("id", topicId)
    .maybeSingle();
  if (error) {
    console.error("[journey] failed to load topic:", error.message);
    return { ok: false, error: "Failed to load this topic." };
  }
  return { ok: true, data: data ? toJourneyTopic(data as RelationshipTopicRow) : null };
}

/** Mark a single topic discussed / not_started (participants may update). */
export async function setTopicStatus(topicId: string, status: TopicStatus): Promise<JourneyOk> {
  const auth = await requireUserId();
  if (!auth.success) return { ok: false, error: auth.error };

  if (!TOPIC_STATUSES.includes(status)) {
    return { ok: false, error: "Invalid topic status." };
  }

  const { error } = await auth.supabase
    .from("relationship_topics")
    .update({ status })
    .eq("id", topicId);
  if (error) {
    console.error("[journey] failed to update topic:", error.message);
    return { ok: false, error: "Failed to update this topic." };
  }
  return { ok: true };
}

/** Shared goals for a pairing, newest first (participants may read). */
export async function listGoals(pairingId: string): Promise<JourneyResult<SharedGoal[]>> {
  const auth = await requireUserId();
  if (!auth.success) return { ok: false, error: auth.error };
  return { ok: true, data: await listGoalsCore(auth.supabase, pairingId) };
}

/** Create a shared goal (status always starts 'not_started'; created_by = session user). */
export async function createGoal(input: CreateGoalInput): Promise<JourneyResult<SharedGoal>> {
  const auth = await requireUserId();
  if (!auth.success) return { ok: false, error: auth.error };

  const title = (input.title ?? "").trim();
  if (title.length === 0) {
    return { ok: false, error: "Give your goal a title." };
  }

  const { data, error } = await auth.supabase
    .from("shared_goals")
    .insert({
      pairing_id: input.pairingId,
      created_by: auth.userId,
      title,
      description: input.description ?? null,
      domain: input.domain ?? null,
      target_date: input.targetDate ?? null,
      status: "not_started",
    })
    .select(GOAL_SELECT)
    .single();
  if (error || !data) {
    console.error("[journey] failed to create goal:", error?.message ?? "no row returned");
    return { ok: false, error: "Failed to create your shared goal." };
  }
  return { ok: true, data: toSharedGoal(data as SharedGoalRow) };
}

/** Update a shared goal — only provided fields change (undefined = leave as-is). */
export async function updateGoal(id: string, patch: UpdateGoalInput): Promise<JourneyResult<SharedGoal>> {
  const auth = await requireUserId();
  if (!auth.success) return { ok: false, error: auth.error };

  const dbPatch: Record<string, unknown> = {};
  if (patch.title !== undefined) {
    const title = patch.title.trim();
    if (title.length === 0) {
      return { ok: false, error: "Give your goal a title." };
    }
    dbPatch.title = title;
  }
  if (patch.description !== undefined) dbPatch.description = patch.description;
  if (patch.domain !== undefined) dbPatch.domain = patch.domain;
  if (patch.targetDate !== undefined) dbPatch.target_date = patch.targetDate;
  if (patch.status !== undefined) {
    if (!GOAL_STATUSES.includes(patch.status)) {
      return { ok: false, error: "Invalid goal status." };
    }
    dbPatch.status = patch.status;
  }

  // Empty patch → no update needed; refetch and return the row as-is.
  if (Object.keys(dbPatch).length > 0) {
    const { error } = await auth.supabase.from("shared_goals").update(dbPatch).eq("id", id);
    if (error) {
      console.error("[journey] failed to update goal:", error.message);
      return { ok: false, error: "Failed to update your shared goal." };
    }
  }

  const { data, error: fetchError } = await auth.supabase
    .from("shared_goals")
    .select(GOAL_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (fetchError || !data) {
    return { ok: false, error: "Goal not found." };
  }
  return { ok: true, data: toSharedGoal(data as SharedGoalRow) };
}

/** Delete a shared goal (both participants may delete per migration 035). */
export async function deleteGoal(id: string): Promise<JourneyOk> {
  const auth = await requireUserId();
  if (!auth.success) return { ok: false, error: auth.error };

  const { error } = await auth.supabase.from("shared_goals").delete().eq("id", id);
  if (error) {
    console.error("[journey] failed to delete goal:", error.message);
    return { ok: false, error: "Failed to delete your shared goal." };
  }
  return { ok: true };
}

/** Shared agreements for a pairing, newest first (participants may read). */
export async function listAgreements(pairingId: string): Promise<JourneyResult<SharedAgreement[]>> {
  const auth = await requireUserId();
  if (!auth.success) return { ok: false, error: auth.error };
  return { ok: true, data: await listAgreementsCore(auth.supabase, pairingId) };
}

/** Create a shared agreement (status always starts 'pending'; created_by = session user). */
export async function createAgreement(input: CreateAgreementInput): Promise<JourneyResult<SharedAgreement>> {
  const auth = await requireUserId();
  if (!auth.success) return { ok: false, error: auth.error };

  const title = (input.title ?? "").trim();
  if (title.length === 0) {
    return { ok: false, error: "Give your agreement a title." };
  }

  const { data, error } = await auth.supabase
    .from("shared_agreements")
    .insert({
      pairing_id: input.pairingId,
      created_by: auth.userId,
      title,
      description: input.description ?? null,
      domain: input.domain ?? null,
      status: "pending",
    })
    .select(AGREEMENT_SELECT)
    .single();
  if (error || !data) {
    console.error("[journey] failed to create agreement:", error?.message ?? "no row returned");
    return { ok: false, error: "Failed to create your agreement." };
  }
  return { ok: true, data: toSharedAgreement(data as SharedAgreementRow) };
}

/** Update an agreement's title/description/domain (status has its own action). */
export async function updateAgreement(
  id: string,
  patch: UpdateAgreementInput,
): Promise<JourneyResult<SharedAgreement>> {
  const auth = await requireUserId();
  if (!auth.success) return { ok: false, error: auth.error };

  const dbPatch: Record<string, unknown> = {};
  if (patch.title !== undefined) {
    const title = patch.title.trim();
    if (title.length === 0) {
      return { ok: false, error: "Give your agreement a title." };
    }
    dbPatch.title = title;
  }
  if (patch.description !== undefined) dbPatch.description = patch.description;
  if (patch.domain !== undefined) dbPatch.domain = patch.domain;

  if (Object.keys(dbPatch).length > 0) {
    const { error } = await auth.supabase.from("shared_agreements").update(dbPatch).eq("id", id);
    if (error) {
      console.error("[journey] failed to update agreement:", error.message);
      return { ok: false, error: "Failed to update your agreement." };
    }
  }

  const { data, error: fetchError } = await auth.supabase
    .from("shared_agreements")
    .select(AGREEMENT_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (fetchError || !data) {
    return { ok: false, error: "Agreement not found." };
  }
  return { ok: true, data: toSharedAgreement(data as SharedAgreementRow) };
}

/** Set an agreement's status ('pending' → 'agreed'; both participants may update). */
export async function setAgreementStatus(
  id: string,
  status: AgreementStatus,
): Promise<JourneyResult<SharedAgreement>> {
  const auth = await requireUserId();
  if (!auth.success) return { ok: false, error: auth.error };

  if (!AGREEMENT_STATUSES.includes(status)) {
    return { ok: false, error: "Invalid agreement status." };
  }

  const { error } = await auth.supabase.from("shared_agreements").update({ status }).eq("id", id);
  if (error) {
    console.error("[journey] failed to update agreement status:", error.message);
    return { ok: false, error: "Failed to update your agreement." };
  }

  const { data, error: fetchError } = await auth.supabase
    .from("shared_agreements")
    .select(AGREEMENT_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (fetchError || !data) {
    return { ok: false, error: "Agreement not found." };
  }
  return { ok: true, data: toSharedAgreement(data as SharedAgreementRow) };
}

/** Delete a shared agreement (both participants may delete per migration 036). */
export async function deleteAgreement(id: string): Promise<JourneyOk> {
  const auth = await requireUserId();
  if (!auth.success) return { ok: false, error: auth.error };

  const { error } = await auth.supabase.from("shared_agreements").delete().eq("id", id);
  if (error) {
    console.error("[journey] failed to delete agreement:", error.message);
    return { ok: false, error: "Failed to delete your agreement." };
  }
  return { ok: true };
}

/**
 * My private reflections across ALL pairings, newest first. ALWAYS scoped to
 * the session user (`.eq('user_id', me)`) — the service never fetches
 * another user's rows; RLS (auth.uid() = user_id) is the real boundary.
 */
export async function listReflections(): Promise<JourneyResult<PrivateReflection[]>> {
  const auth = await requireUserId();
  if (!auth.success) return { ok: false, error: auth.error };
  return { ok: true, data: await listReflectionsCore(auth.supabase, auth.userId) };
}

/** Create a private reflection — user_id comes from the session, never the caller. */
export async function createReflection(input: CreateReflectionInput): Promise<JourneyResult<PrivateReflection>> {
  const auth = await requireUserId();
  if (!auth.success) return { ok: false, error: auth.error };

  const content = (input.content ?? "").trim();
  if (content.length === 0) {
    return { ok: false, error: "Write something before saving your reflection." };
  }
  if (content.length > REFLECTION_MAX_LENGTH) {
    return { ok: false, error: `Reflections are limited to ${REFLECTION_MAX_LENGTH} characters.` };
  }

  const { data, error } = await auth.supabase
    .from("private_reflections")
    .insert({
      user_id: auth.userId,
      pairing_id: input.pairingId ?? null,
      topic_id: input.topicId ?? null,
      category_id: input.categoryId ?? null,
      content,
    })
    .select(REFLECTION_SELECT)
    .single();
  if (error || !data) {
    console.error("[journey] failed to create reflection:", error?.message ?? "no row returned");
    return { ok: false, error: "Failed to save your reflection." };
  }
  return { ok: true, data: toPrivateReflection(data as PrivateReflectionRow) };
}

/** Update MY reflection (owner-scoped: eq id AND user_id). */
export async function updateReflection(
  id: string,
  patch: UpdateReflectionInput,
): Promise<JourneyResult<PrivateReflection>> {
  const auth = await requireUserId();
  if (!auth.success) return { ok: false, error: auth.error };

  const content = (patch.content ?? "").trim();
  if (content.length === 0) {
    return { ok: false, error: "Write something before saving your reflection." };
  }
  if (content.length > REFLECTION_MAX_LENGTH) {
    return { ok: false, error: `Reflections are limited to ${REFLECTION_MAX_LENGTH} characters.` };
  }

  const { error } = await auth.supabase
    .from("private_reflections")
    .update({ content })
    .eq("id", id)
    .eq("user_id", auth.userId);
  if (error) {
    console.error("[journey] failed to update reflection:", error.message);
    return { ok: false, error: "Failed to update your reflection." };
  }

  const { data, error: fetchError } = await auth.supabase
    .from("private_reflections")
    .select(REFLECTION_SELECT)
    .eq("id", id)
    .eq("user_id", auth.userId)
    .maybeSingle();
  if (fetchError || !data) {
    return { ok: false, error: "Reflection not found." };
  }
  return { ok: true, data: toPrivateReflection(data as PrivateReflectionRow) };
}

/** Delete MY reflection (owner-scoped: eq id AND user_id). */
export async function deleteReflection(id: string): Promise<JourneyOk> {
  const auth = await requireUserId();
  if (!auth.success) return { ok: false, error: auth.error };

  const { error } = await auth.supabase
    .from("private_reflections")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.userId);
  if (error) {
    console.error("[journey] failed to delete reflection:", error.message);
    return { ok: false, error: "Failed to delete your reflection." };
  }
  return { ok: true };
}

/**
 * REAL persisted journey counts (never invented percentages):
 *  - topicsTotal:      current report's conversationGuides length.
 *  - topicsDiscussed:  count of relationship_topics rows with status
 *                      'discussed' (lightweight exact-count query).
 *  - goalsActive / goalsCompleted: computed from the pairing's shared_goals
 *                      rows (not_started + in_progress = active).
 */
export async function getJourneyCounts(pairingId: string): Promise<JourneyResult<JourneyCounts>> {
  const auth = await requireUserId();
  if (!auth.success) return { ok: false, error: auth.error };

  const guides = await loadReportGuides(auth.supabase, pairingId);
  return countsCore(auth.supabase, pairingId, guides);
}
