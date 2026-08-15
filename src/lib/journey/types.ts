/**
 * Journey ("Your SolidGround Journey" + Shared Growth Plan) — shared types
 * for the web Journey data layer (migrations 035 + 036).
 *
 * The Journey is the post-pairing growth layer: conversation topics (derived
 * from comparison_reports.conversation_guides), shared goals, shared
 * agreements, and owner-only private reflections. The tables are shared with
 * the mobile app (one account, one dataset) — these types mirror the mobile
 * domain models in `lib/journey/types.ts` / `lib/agreements/types.ts` 1:1 so
 * the web UI consumes the same vocabulary.
 *
 * Privacy rule (owner directive): private reflections are owner-only. The
 * partner never sees them, and they are NEVER sent to any coach provider.
 *
 * Naming convention (repo-wide): camelCase domain types for UI/display,
 * snake_case row types for the raw Supabase table shapes.
 */
import type { ConversationGuide } from "@/types";

// ── Scalar enums (migration 035/036 CHECK constraints) ────────
/** Per-topic progress — "Discussed" is the only user-writable state. */
export type TopicStatus = "not_started" | "discussed";

/** Shared-goal lifecycle (migration 035 CHECK constraint). */
export type GoalStatus = "not_started" | "in_progress" | "completed";

/** Shared-agreement lifecycle (migration 036 CHECK constraint). */
export type AgreementStatus = "pending" | "agreed";

// ── Supabase row shapes (snake_case) ──────────────────────────
/**
 * Row shape of the shared `relationship_topics` table (migration 035).
 * One row per pairing per conversation topic; synced from
 * comparison_reports.conversation_guides. `prompts` is a JSONB column —
 * services parse it defensively (tolerates stringified payloads).
 */
export interface RelationshipTopicRow {
  id: string;
  pairing_id: string;
  category_id: string; // one of the 12 CATEGORY_ORDER ids
  category_name: string; // canonical CATEGORY_LABELS value
  topic: string; // ConversationGuide.topic verbatim
  prompts: unknown; // JSONB: string[] or stringified JSON
  status: TopicStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Row shape of the shared `shared_goals` table (migration 035).
 * Visible to both pairing participants; created_by records who created it.
 */
export interface SharedGoalRow {
  id: string;
  pairing_id: string;
  created_by: string;
  title: string;
  description: string | null;
  domain: string | null; // one of the 12 category ids or null
  target_date: string | null; // TIMESTAMPTZ, ISO string
  status: GoalStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Row shape of the shared `shared_agreements` table (migration 036).
 * Visible to both pairing participants; created_by records who proposed it.
 */
export interface SharedAgreementRow {
  id: string;
  pairing_id: string;
  created_by: string;
  title: string;
  description: string | null;
  domain: string | null;
  status: AgreementStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Row shape of the shared `private_reflections` table (migration 035).
 * OWNER-ONLY data (RLS: auth.uid() = user_id). pairing_id/topic_id are
 * nullable — ON DELETE SET NULL preserves the user's own notes after a
 * disconnect or topic removal.
 */
export interface PrivateReflectionRow {
  id: string;
  user_id: string;
  pairing_id: string | null;
  topic_id: string | null;
  category_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

// ── Domain models (what the UI consumes) ──────────────────────
/**
 * A journey conversation topic: the report's ConversationGuide merged with
 * the persisted "Discussed" status. Topic text/prompts are rendered verbatim
 * from the report — never regenerated client-side.
 *
 * `id` is the relationship_topics row id — the UI needs it to deep-link to
 * /dashboard/journey/topics/[topicId] and to call setTopicStatus (which
 * updates by row id).
 */
export interface JourneyTopic extends ConversationGuide {
  /** relationship_topics row id (stable across report refreshes). */
  id: string;
  /** Persisted progress; survives report refresh via (category_id, topic) match. */
  status: TopicStatus;
}

/** A user's private reflection (owner-only; never shared with the partner). */
export interface PrivateReflection {
  id: string;
  pairingId: string | null;
  topicId: string | null;
  categoryId: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
}

/** A shared goal, display-ready. */
export interface SharedGoal {
  id: string;
  pairingId: string;
  createdBy: string;
  title: string;
  description: string | null;
  domain: string | null;
  targetDate: string | null;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
}

/** A shared agreement, display-ready. */
export interface SharedAgreement {
  id: string;
  pairingId: string;
  createdBy: string;
  title: string;
  description: string | null;
  domain: string | null;
  status: AgreementStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Journey counts — REAL persisted counts only (no percentages):
 *  - topicsTotal:      number of conversation guides in the CURRENT report.
 *  - topicsDiscussed:  relationship_topics rows with status 'discussed'.
 *  - goalsActive:      shared_goals rows not yet completed
 *                      (status not_started or in_progress).
 *  - goalsCompleted:   shared_goals rows with status 'completed'.
 */
export interface JourneyCounts {
  topicsTotal: number;
  topicsDiscussed: number;
  goalsActive: number;
  goalsCompleted: number;
}

/**
 * Journey dashboard aggregate. The Journey is scoped to the user's MOST
 * RECENT active/accepted pairing (owner decision): when the user has no
 * accepted/active/completed pairing, `{ hasPairing: false }` lets the UI
 * render its empty state instead of a broken, pairing-less dashboard.
 */
export type JourneyDashboard =
  | { hasPairing: false }
  | {
      hasPairing: true;
      pairingId: string;
      topics: JourneyTopic[];
      goals: SharedGoal[];
      agreements: SharedAgreement[];
      reflections: PrivateReflection[];
      counts: JourneyCounts;
    };

// ── Inputs (server actions) ───────────────────────────────────
/** Create a shared goal (status always starts 'not_started'). */
export interface CreateGoalInput {
  pairingId: string;
  title: string;
  description?: string | null;
  domain?: string | null;
  targetDate?: string | null;
}

/** Partial update for a shared goal — only provided fields change. */
export interface UpdateGoalInput {
  title?: string;
  description?: string | null;
  domain?: string | null;
  targetDate?: string | null;
  status?: GoalStatus;
}

/** Create a shared agreement (status always starts 'pending'). */
export interface CreateAgreementInput {
  pairingId: string;
  title: string;
  description?: string | null;
  domain?: string | null;
}

/** Partial update for a shared agreement (status has its own action). */
export interface UpdateAgreementInput {
  title?: string;
  description?: string | null;
  domain?: string | null;
}

/**
 * Create a private reflection. user_id comes from the session — never the
 * caller. pairing_id/topic_id/category_id are all optional: a reflection can
 * be a free-form note not tied to a topic or pairing (the table allows NULL).
 */
export interface CreateReflectionInput {
  pairingId?: string | null;
  topicId?: string | null;
  categoryId?: string | null;
  content: string;
}

/** Partial update for a reflection (content is the only mutable field). */
export interface UpdateReflectionInput {
  content?: string;
}
