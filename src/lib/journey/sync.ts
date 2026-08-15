/**
 * Journey — pure topic-sync planning (mirrors the mobile
 * `lib/journey/sync.ts` so web and mobile reconcile relationship_topics
 * identically).
 *
 * Pure logic (no Supabase, no side effects): computes what
 * ensureTopicsFromReport must do to reconcile relationship_topics rows
 * with the CURRENT report's conversation guides. Separating this from the
 * service makes the status-preservation rule directly unit-testable.
 *
 * Sync rules (migration 035 RLS-critical — see the live 42501 bug note):
 *  - guides whose (category_id, topic) key is NOT in the existing rows →
 *    INSERT (status 'not_started', created_by supplied by the caller).
 *  - existing rows whose key IS in the new guides → refresh ONLY
 *    category_name + prompts via a plain UPDATE BY ID. status and
 *    created_by are deliberately absent: the table's INSERT policy has
 *    WITH CHECK (created_by = auth.uid()), so an upsert on the UNIQUE
 *    (pairing_id, category_id, topic) constraint would evaluate the
 *    INSERT side with created_by = NULL and fail with 42501. UPDATE-by-id
 *    only carries category_name/prompts and passes the UPDATE policy
 *    (USING: pairing participant — no created_by requirement), so
 *    "Discussed" status survives a report refresh.
 *  - stale rows are NOT deleted: migration 035 defines no DELETE policy on
 *    relationship_topics (rows die only via pairing CASCADE). The stale
 *    rows are inert — the current report remains the Journey's source of
 *    truth. Adding a DELETE policy is an owner decision.
 */
import type { ConversationGuide } from "@/types";
import type { RelationshipTopicRow, TopicStatus } from "./types";

/** New row payload — status is always the DB default 'not_started'. */
export interface TopicInsertPayload {
  pairing_id: string;
  category_id: string;
  category_name: string;
  topic: string;
  prompts: string[];
  status: TopicStatus;
}

/** Existing row refresh — status/created_by deliberately absent. */
export interface TopicUpdatePayload {
  id: string;
  category_name: string;
  prompts: string[];
}

export interface TopicSyncPlan {
  toInsert: TopicInsertPayload[];
  toUpdate: TopicUpdatePayload[];
  toDelete: string[];
}

const KEY_SEPARATOR = "\u0000";

/** Stable identity of a topic: (category_id, topic). */
export function topicKey(categoryId: string, topic: string): string {
  return `${categoryId}${KEY_SEPARATOR}${topic}`;
}

/** Guides missing required string fields are skipped defensively. */
function isGuideUsable(guide: ConversationGuide): boolean {
  return (
    typeof guide.categoryId === "string" &&
    guide.categoryId.length > 0 &&
    typeof guide.categoryName === "string" &&
    typeof guide.topic === "string" &&
    guide.topic.length > 0 &&
    Array.isArray(guide.prompts)
  );
}

/**
 * Computes the insert/update/delete plan for one sync.
 * `pairingId` scopes new rows; `existing` rows come from relationship_topics
 * (filtered to the pairing); `guides` are the CURRENT report's
 * conversationGuides (verbatim). Duplicate guide keys are collapsed (first
 * occurrence wins).
 */
export function planTopicSync(
  pairingId: string,
  existing: RelationshipTopicRow[],
  guides: ConversationGuide[],
): TopicSyncPlan {
  const usable = guides.filter(isGuideUsable);

  const existingByKey = new Map<string, RelationshipTopicRow>();
  for (const row of existing) {
    existingByKey.set(topicKey(row.category_id, row.topic), row);
  }

  const seen = new Set<string>();
  const toInsert: TopicInsertPayload[] = [];
  const toUpdate: TopicUpdatePayload[] = [];
  for (const guide of usable) {
    const key = topicKey(guide.categoryId, guide.topic);
    if (seen.has(key)) continue; // duplicate guide — first occurrence wins
    seen.add(key);

    const row = existingByKey.get(key);
    if (!row) {
      toInsert.push({
        pairing_id: pairingId,
        category_id: guide.categoryId,
        category_name: guide.categoryName,
        topic: guide.topic,
        prompts: guide.prompts,
        status: "not_started",
      });
      continue;
    }
    // Plain UPDATE by id (NOT an upsert — the INSERT-side WITH CHECK on
    // created_by would fail with 42501). Only category_name/prompts refresh;
    // status ("Discussed") and created_by survive.
    toUpdate.push({
      id: row.id,
      category_name: guide.categoryName,
      prompts: guide.prompts,
    });
  }

  // Stale rows: computed for symmetry with the mobile planner, but the
  // service deliberately never executes them (migration 035 has no DELETE
  // policy on relationship_topics).
  const toDelete: string[] = [];
  for (const row of existing) {
    if (!seen.has(topicKey(row.category_id, row.topic))) {
      toDelete.push(row.id);
    }
  }

  return { toInsert, toUpdate, toDelete };
}
