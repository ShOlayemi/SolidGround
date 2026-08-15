"use server";

// ──────────────────────────────────────────────────────────────
// SolidGround AI — Coach Data-Layer Server Actions
// ──────────────────────────────────────────────────────────────
// CRUD + message flow over the shared coach tables (migration 033:
// coach_conversations, coach_messages — both RLS-private to the
// owner, messages append-only). Mirrors the style of
// src/lib/pairings/actions.ts and src/lib/ai/actions.ts: every
// action validates the current user via createClient() and enforces
// ownership (RLS-backed queries PLUS an explicit user_id check so a
// cross-user access attempt is never mistaken for a missing row).
//
// sendCoachMessage() is the core flow: verify ownership → insert the
// user message → fetch the capped transcript → fetch the compact
// Blueprint context (latest completed assessment, or null) → generate
// the reply through the SAME shared generator as the mobile API route
// (src/lib/ai/coach-reply.ts — mock fallback or OpenAI) → insert the
// coach reply → touch the conversation's updated_at (the migration-033
// BEFORE UPDATE trigger stamps it).
// ──────────────────────────────────────────────────────────────

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { generateCoachReply } from "@/lib/ai/coach-reply";
import {
  COACH_HISTORY_LIMIT,
  COACH_MESSAGE_MAX_LENGTH,
  type CoachBlueprintContextPayload,
  type CoachChatHistoryItem,
} from "@/lib/ai/coach-prompt";
import { getQuestionById } from "@/lib/assessment/questions";
import type { CategoryResult } from "@/lib/scoring/types";

// ── Types ─────────────────────────────────────────────────────

export interface CoachMessage {
  id: string;
  conversationId: string;
  role: "user" | "coach";
  content: string;
  createdAt: string;
}

export interface CoachConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
}

export interface CoachConversationDetail extends CoachConversationSummary {
  createdAt: string;
  messages: CoachMessage[];
}

/** How many strengths/areas the coach context carries (mirrors the mobile client). */
const BLUEPRINT_CONTEXT_ITEM_LIMIT = 3;

/** Max title length for renameConversation (defensive cap). */
const COACH_TITLE_MAX_LENGTH = 200;

// ── Helpers ───────────────────────────────────────────────────

type AuthResult =
  | { success: true; userId: string; supabase: SupabaseClient }
  | { success: false; error: string };

async function requireUserId(): Promise<AuthResult> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return { success: false, error: "Not authenticated." };
  }
  return { success: true, userId: session.user.id, supabase };
}

/** Map a coach_messages row to the public CoachMessage shape. */
function toCoachMessage(row: {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  created_at: string;
}): CoachMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role === "coach" ? "coach" : "user",
    content: row.content,
    createdAt: row.created_at,
  };
}

/**
 * Ownership-guarded read of a conversation row. Returns a not-found
 * error when the row is missing OR belongs to another user (RLS hides
 * other users' rows in production; the explicit check covers the same
 * ground defensively and keeps the guard testable).
 */
async function getOwnedConversation(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string,
): Promise<
  | { ok: true; conversation: { id: string; title: string; createdAt: string; updatedAt: string } }
  | { ok: false; error: string }
> {
  const { data, error } = await supabase
    .from("coach_conversations")
    .select("id, title, user_id, created_at, updated_at")
    .eq("id", conversationId)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: "Conversation not found." };
  }
  if (data.user_id !== userId) {
    return { ok: false, error: "Conversation not found." };
  }
  return {
    ok: true,
    conversation: {
      id: data.id,
      title: data.title,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    },
  };
}

/**
 * Build the compact Blueprint context for the coach from the user's
 * latest completed assessment (relationship mode) and its
 * blueprint_results row. Deliberately minimal — top strengths, areas
 * to explore (question-level, ranked) and per-domain snippets only;
 * never answers, reflections, or the full results row. Returns null
 * when the user has no completed assessment or no results row yet (a
 * context-read problem must never block a conversation).
 */
async function fetchBlueprintContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<CoachBlueprintContextPayload | null> {
  const { data: session, error: sessionError } = await supabase
    .from("assessment_sessions")
    .select("id, mode")
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (sessionError) {
    console.warn("[coach] Blueprint context session lookup failed:", sessionError.message);
    return null;
  }
  if (!session) return null;

  const { data: row, error: resultsError } = await supabase
    .from("blueprint_results")
    .select("category_results")
    .eq("session_id", session.id)
    .eq("user_id", userId)
    .maybeSingle();
  if (resultsError) {
    console.warn("[coach] Blueprint context results lookup failed:", resultsError.message);
    return null;
  }
  const categoryResults = row?.category_results as CategoryResult[] | undefined;
  if (!categoryResults || categoryResults.length === 0) return null;

  // Question-level strengths/areas, ranked deterministically.
  const strengthItems: Array<{ category: string; label: string; questionText: string; score: number }> = [];
  const areaItems: Array<{ category: string; label: string; questionText: string; score: number }> = [];
  for (const cr of categoryResults) {
    for (const qId of cr.strengths ?? []) {
      strengthItems.push({
        category: cr.category,
        label: cr.label,
        questionText: getQuestionById(qId)?.text ?? "",
        score: cr.questionScores?.[qId] ?? 0,
      });
    }
    for (const qId of cr.growthAreas ?? []) {
      areaItems.push({
        category: cr.category,
        label: cr.label,
        questionText: getQuestionById(qId)?.text ?? "",
        score: cr.questionScores?.[qId] ?? 0,
      });
    }
  }
  strengthItems.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
  areaItems.sort((a, b) => a.score - b.score || a.label.localeCompare(b.label));

  return {
    relationshipMode: session.mode === "platonic" ? "platonic" : "romantic",
    topStrengths: strengthItems.slice(0, BLUEPRINT_CONTEXT_ITEM_LIMIT).map((item) => ({
      category: item.category,
      label: item.label,
      questionText: item.questionText,
    })),
    areasToExplore: areaItems.slice(0, BLUEPRINT_CONTEXT_ITEM_LIMIT).map((item) => ({
      category: item.category,
      label: item.label,
      questionText: item.questionText,
    })),
    domainSnippets: categoryResults.map((cr) => ({
      category: cr.category,
      label: cr.label,
      score: cr.score,
      ...(cr.dealBreakerTriggered ? { dealBreakerTriggered: true } : {}),
    })),
  };
}

// ── Server Actions ────────────────────────────────────────────

/** Create a new conversation (title "New conversation"). */
export async function createConversation(): Promise<{ ok: boolean; id?: string; error?: string }> {
  const auth = await requireUserId();
  if (!auth.success) return { ok: false, error: auth.error };

  const { data, error } = await auth.supabase
    .from("coach_conversations")
    .insert({ user_id: auth.userId, title: "New conversation" })
    .select("id")
    .single();

  if (error || !data) {
    console.error("Error creating coach conversation:", error?.message ?? "no row returned");
    return { ok: false, error: "Failed to create conversation." };
  }
  return { ok: true, id: data.id };
}

/** List the current user's conversations, most-recently-active first. */
export async function listConversations(): Promise<{
  ok: boolean;
  conversations?: CoachConversationSummary[];
  error?: string;
}> {
  const auth = await requireUserId();
  if (!auth.success) return { ok: false, error: auth.error };

  const { data, error } = await auth.supabase
    .from("coach_conversations")
    .select("id, title, updated_at")
    .eq("user_id", auth.userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error listing coach conversations:", error.message);
    return { ok: false, error: "Failed to load conversations." };
  }

  return {
    ok: true,
    conversations: (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      updatedAt: row.updated_at,
    })),
  };
}

/** Get one conversation with its transcript, oldest-first (owner-only). */
export async function getConversation(conversationId: string): Promise<{
  ok: boolean;
  conversation?: CoachConversationDetail;
  error?: string;
}> {
  const auth = await requireUserId();
  if (!auth.success) return { ok: false, error: auth.error };

  const owned = await getOwnedConversation(auth.supabase, conversationId, auth.userId);
  if (!owned.ok) return owned;

  const { data: rows, error } = await auth.supabase
    .from("coach_messages")
    .select("id, conversation_id, role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error loading coach messages:", error.message);
    return { ok: false, error: "Failed to load conversation." };
  }

  return {
    ok: true,
    conversation: {
      id: owned.conversation.id,
      title: owned.conversation.title,
      createdAt: owned.conversation.createdAt,
      updatedAt: owned.conversation.updatedAt,
      messages: (rows ?? []).map(toCoachMessage),
    },
  };
}

/**
 * The core coach turn: persist the user's message, generate the reply
 * (mock fallback or OpenAI — shared with the mobile API route), persist
 * the coach reply, and touch the conversation's updated_at.
 */
export async function sendCoachMessage(
  conversationId: string,
  message: string,
): Promise<{ ok: boolean; coachMessage?: CoachMessage; error?: string }> {
  const auth = await requireUserId();
  if (!auth.success) return { ok: false, error: auth.error };

  if (typeof message !== "string" || message.trim().length === 0) {
    return { ok: false, error: "Message is required." };
  }
  const trimmed = message.trim();
  if (trimmed.length > COACH_MESSAGE_MAX_LENGTH) {
    return { ok: false, error: `Message is too long (max ${COACH_MESSAGE_MAX_LENGTH} characters).` };
  }

  // 1. Verify conversation ownership.
  const owned = await getOwnedConversation(auth.supabase, conversationId, auth.userId);
  if (!owned.ok) return owned;

  // 2. Insert the user message (append-only transcript).
  const { data: userMsg, error: insertError } = await auth.supabase
    .from("coach_messages")
    .insert({ conversation_id: conversationId, role: "user", content: trimmed })
    .select("id, conversation_id, role, content, created_at")
    .single();
  if (insertError || !userMsg) {
    console.error("Error inserting coach user message:", insertError?.message ?? "no row returned");
    return { ok: false, error: "Failed to send message." };
  }

  // 3. Transcript — the most recent COACH_HISTORY_LIMIT messages,
  //    oldest first, EXCLUDING the message just inserted (the reply
  //    generator receives it as `message`, matching the route contract).
  const { data: recentRows, error: transcriptError } = await auth.supabase
    .from("coach_messages")
    .select("id, role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(COACH_HISTORY_LIMIT + 1);
  if (transcriptError) {
    console.error("Error loading coach transcript:", transcriptError.message);
    return { ok: false, error: "Failed to send message." };
  }
  const history: CoachChatHistoryItem[] = (recentRows ?? [])
    .filter((row) => row.id !== userMsg.id)
    .reverse()
    .map((row) => ({ role: row.role === "coach" ? "coach" : "user", content: row.content }));

  // 4. Compact Blueprint context from the latest completed assessment
  //    (or null when the user has none — the coach runs ungrounded).
  const blueprintContext = await fetchBlueprintContext(auth.supabase, auth.userId);

  // 5. Generate the coach reply (mock fallback or OpenAI — shared with
  //    the route, never HTTP-ing it).
  let content: string;
  try {
    content = await generateCoachReply({ message: trimmed, history, blueprintContext });
  } catch (err) {
    console.error(
      "Coach reply generation failed:",
      err instanceof Error ? err.message : String(err),
    );
    return { ok: false, error: "The coaching service is temporarily unavailable. Please try again." };
  }

  // 6. Insert the coach reply.
  const { data: coachMsg, error: coachError } = await auth.supabase
    .from("coach_messages")
    .insert({ conversation_id: conversationId, role: "coach", content })
    .select("id, conversation_id, role, content, created_at")
    .single();
  if (coachError || !coachMsg) {
    console.error("Error inserting coach reply:", coachError?.message ?? "no row returned");
    return { ok: false, error: "Failed to save the coach reply." };
  }

  // 7. Touch updated_at — a real UPDATE so the migration-033 BEFORE
  //    UPDATE trigger stamps it (title is set to its current value).
  const { error: touchError } = await auth.supabase
    .from("coach_conversations")
    .update({ title: owned.conversation.title })
    .eq("id", conversationId);
  if (touchError) {
    console.error("Error touching coach conversation updated_at:", touchError.message);
    // Non-fatal: both messages are already stored.
  }

  return { ok: true, coachMessage: toCoachMessage(coachMsg) };
}

/** Delete a conversation (messages are removed via ON DELETE CASCADE). */
export async function deleteConversation(conversationId: string): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireUserId();
  if (!auth.success) return { ok: false, error: auth.error };

  const owned = await getOwnedConversation(auth.supabase, conversationId, auth.userId);
  if (!owned.ok) return owned;

  const { error } = await auth.supabase
    .from("coach_conversations")
    .delete()
    .eq("id", conversationId);
  if (error) {
    console.error("Error deleting coach conversation:", error.message);
    return { ok: false, error: "Failed to delete conversation." };
  }
  return { ok: true };
}

/** Rename a conversation (owner-only). */
export async function renameConversation(
  conversationId: string,
  title: string,
): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireUserId();
  if (!auth.success) return { ok: false, error: auth.error };

  if (typeof title !== "string" || title.trim().length === 0) {
    return { ok: false, error: "Title is required." };
  }
  const trimmedTitle = title.trim().slice(0, COACH_TITLE_MAX_LENGTH);

  const owned = await getOwnedConversation(auth.supabase, conversationId, auth.userId);
  if (!owned.ok) return owned;

  const { error } = await auth.supabase
    .from("coach_conversations")
    .update({ title: trimmedTitle })
    .eq("id", conversationId);
  if (error) {
    console.error("Error renaming coach conversation:", error.message);
    return { ok: false, error: "Failed to rename conversation." };
  }
  return { ok: true };
}
