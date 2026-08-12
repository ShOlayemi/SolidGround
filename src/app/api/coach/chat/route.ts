// ──────────────────────────────────────────────────────────────
// SolidGround AI — Coach Chat API (ADD for mobile client)
// ──────────────────────────────────────────────────────────────
// MOBILE-CLIENT ADD (owner-approved, Sprint 8 / Candidate A): the
// mobile app's OpenAI Relationship Coach backend. NEW route only —
// no existing web-app behavior, file, migration, or RLS policy is
// touched; the web app's live behavior is unchanged.
//
// The mobile client (lib/coach/openaiProvider.ts, master fd917b5) is
// already built and tested against this exact contract:
//
//   POST /api/coach/chat
//   Authorization: Bearer <supabase access token>
//   Content-Type: application/json
//   Request: {
//     "message": string,                 // the user's trimmed message
//     "conversationId": string | null,   // null for a new conversation
//     "history": [{ "role": "user"|"coach", "content": string }],  // persisted transcript, oldest first
//     "blueprintContext": {              // null when the user has no results
//       "relationshipMode": "romantic"|"platonic",
//       "topStrengths": [{category,label,questionText}],
//       "areasToExplore": [{category,label,questionText}],
//       "domainSnippets": [{category,label,score,dealBreakerTriggered?}]
//     } | null
//   }
//   Response 200: { "content": string }  // echo NOTHING else
//   Errors: 401 → token rejected ("sign in again"); 400 → malformed
//           body; 5xx → backend failure (client maps to a friendly
//           state and never fabricates a response).
//
// DESIGN:
//   • STATELESS — the backend never reads the database. The client
//     sends the persisted coach_messages transcript as `history`
//     (append-only, RLS owner-only, migration 033); this route is a
//     chat-completion proxy.
//   • CONTEXT MINIMIZATION (hard rule) — the prompt contains ONLY the
//     client's message + history + compact blueprintContext envelope
//     (see src/lib/ai/coach-prompt.ts). Never full Blueprint results,
//     raw answers, reflections, or profile data.
//   • AI SAFETY — the system prompt (built in coach-prompt.ts) encodes
//     the Sprint 8 brief: not a therapist/doctor/lawyer/emergency
//     service; no diagnosis, person-labeling, or outcome prediction;
//     no decisions for the user; tentative decision-support framing;
//     refusal of manipulation/coercion tactics; safety-first handling
//     of threats/violence/abuse; no invented hotlines or service names.
//   • KEY HANDLING — OpenAI key stays server-side: getOpenAI() reads
//     process.env.OPENAI_API_KEY (throws → 500 if unset). The service-
//     role key is never involved; only the caller's bearer token.
//   • NO CONTENT LOGGING — no audit row is written, and server logs
//     carry only the failure kind, never conversation content.
//   • TIME BOUND — the OpenAI call is capped server-side (the mobile
//     client aborts at 15 s; this must beat that).
// ──────────────────────────────────────────────────────────────
import type OpenAI from "openai";
import {
  authenticateRequest,
  json,
  optionsResponse,
} from "@/lib/pairings/mobile-api";
import { getOpenAI } from "@/lib/ai/service";
import {
  COACH_HISTORY_LIMIT,
  COACH_MESSAGE_MAX_LENGTH,
  buildCoachSystemPrompt,
  buildCoachUserMessage,
} from "@/lib/ai/coach-prompt";
import type {
  CoachChatHistoryItem,
  CoachBlueprintContextPayload,
  CoachChatUserMessageInput,
  CoachContextItem,
  CoachDomainSnippet,
} from "@/lib/ai/coach-prompt";

export const runtime = "nodejs";

/** Server-side bound on the OpenAI call — the client aborts at 15 s. */
const COACH_CALL_TIMEOUT_MS = 12_000;

/** Max completion tokens for a coach reply (a few short paragraphs). */
const COACH_MAX_TOKENS = 800;

/** CORS preflight (shared helper — mirrors the pairing routes). */
export async function OPTIONS() {
  return optionsResponse();
}

/** Parsed, validated coach chat request (the route's only input). */
interface CoachChatRequest {
  message: string;
  conversationId: string | null;
  history: CoachChatHistoryItem[];
  blueprintContext: CoachBlueprintContextPayload | null;
}

type ParseResult =
  | { ok: true; data: CoachChatRequest }
  | { ok: false; error: string };

/** Validate one {category,label,questionText} item array. */
function parseContextItems(
  value: unknown,
  field: string,
): { ok: true; items: CoachContextItem[] } | { ok: false; error: string } {
  if (!Array.isArray(value)) {
    return { ok: false, error: `blueprintContext.${field} must be an array.` };
  }
  const items: CoachContextItem[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) {
      return { ok: false, error: `blueprintContext.${field} contains an invalid entry.` };
    }
    const row = item as Record<string, unknown>;
    if (
      typeof row.category !== "string" ||
      typeof row.label !== "string" ||
      typeof row.questionText !== "string"
    ) {
      return { ok: false, error: `blueprintContext.${field} contains an invalid entry.` };
    }
    items.push({ category: row.category, label: row.label, questionText: row.questionText });
  }
  return { ok: true, items };
}

/** Validate the domainSnippets array. */
function parseDomainSnippets(
  value: unknown,
): { ok: true; items: CoachDomainSnippet[] } | { ok: false; error: string } {
  if (!Array.isArray(value)) {
    return { ok: false, error: "blueprintContext.domainSnippets must be an array." };
  }
  const items: CoachDomainSnippet[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) {
      return { ok: false, error: "blueprintContext.domainSnippets contains an invalid entry." };
    }
    const row = item as Record<string, unknown>;
    if (
      typeof row.category !== "string" ||
      typeof row.label !== "string" ||
      typeof row.score !== "number"
    ) {
      return { ok: false, error: "blueprintContext.domainSnippets contains an invalid entry." };
    }
    if (row.dealBreakerTriggered !== undefined && typeof row.dealBreakerTriggered !== "boolean") {
      return { ok: false, error: "blueprintContext.domainSnippets contains an invalid entry." };
    }
    items.push({
      category: row.category,
      label: row.label,
      score: row.score,
      ...(row.dealBreakerTriggered !== undefined
        ? { dealBreakerTriggered: row.dealBreakerTriggered }
        : {}),
    });
  }
  return { ok: true, items };
}

/**
 * Manual body validation (the repo has no zod — this mirrors the
 * pairing routes' style). 400 with a plain user-safe message on any
 * malformed shape. History is capped to the most recent
 * COACH_HISTORY_LIMIT turns; message length is capped.
 */
function parseCoachChatBody(body: unknown): ParseResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, error: "Invalid request body." };
  }
  const record = body as Record<string, unknown>;

  // ── message ─────────────────────────────────────────────────
  if (typeof record.message !== "string" || record.message.trim().length === 0) {
    return { ok: false, error: "message is required." };
  }
  const message = record.message.trim();
  if (message.length > COACH_MESSAGE_MAX_LENGTH) {
    return {
      ok: false,
      error: `message is too long (max ${COACH_MESSAGE_MAX_LENGTH} characters).`,
    };
  }

  // ── conversationId ──────────────────────────────────────────
  const rawConversationId = record.conversationId;
  if (
    rawConversationId !== undefined &&
    rawConversationId !== null &&
    typeof rawConversationId !== "string"
  ) {
    return { ok: false, error: "conversationId must be a string or null." };
  }
  const conversationId = typeof rawConversationId === "string" ? rawConversationId : null;

  // ── history ─────────────────────────────────────────────────
  if (!Array.isArray(record.history)) {
    return { ok: false, error: "history must be an array." };
  }
  const history: CoachChatHistoryItem[] = [];
  for (const item of record.history) {
    if (typeof item !== "object" || item === null) {
      return { ok: false, error: "history contains an invalid entry." };
    }
    const row = item as Record<string, unknown>;
    if (row.role !== "user" && row.role !== "coach") {
      return { ok: false, error: "history contains an invalid role." };
    }
    if (typeof row.content !== "string") {
      return { ok: false, error: "history contains an invalid entry." };
    }
    history.push({ role: row.role, content: row.content });
  }
  const cappedHistory = history.slice(-COACH_HISTORY_LIMIT);

  // ── blueprintContext ────────────────────────────────────────
  const rawContext = record.blueprintContext;
  let blueprintContext: CoachBlueprintContextPayload | null = null;
  if (rawContext !== undefined && rawContext !== null) {
    if (typeof rawContext !== "object" || Array.isArray(rawContext)) {
      return { ok: false, error: "blueprintContext must be an object or null." };
    }
    const ctx = rawContext as Record<string, unknown>;
    if (ctx.relationshipMode !== "romantic" && ctx.relationshipMode !== "platonic") {
      return { ok: false, error: "blueprintContext.relationshipMode must be 'romantic' or 'platonic'." };
    }
    const strengths = parseContextItems(ctx.topStrengths, "topStrengths");
    if (!strengths.ok) return strengths;
    const areas = parseContextItems(ctx.areasToExplore, "areasToExplore");
    if (!areas.ok) return areas;
    const snippets = parseDomainSnippets(ctx.domainSnippets);
    if (!snippets.ok) return snippets;
    blueprintContext = {
      relationshipMode: ctx.relationshipMode,
      topStrengths: strengths.items,
      areasToExplore: areas.items,
      domainSnippets: snippets.items,
    };
  }

  return {
    ok: true,
    data: { message, conversationId, history: cappedHistory, blueprintContext },
  };
}

/**
 * POST /api/coach/chat — one stateless coach turn:
 * authenticate → validate → compose prompt → OpenAI completion →
 * { content }. Any failure returns a 5xx with a plain user-safe body
 * (never a raw error, never a key name).
 */
export async function POST(request: Request) {
  // 1. Bearer-token authentication (shared helper — 401 style matches
  //    the pairing routes).
  const auth = await authenticateRequest(request);
  if (!auth.ok) return auth.response;

  // 2. Parse + validate the body (400 on malformed).
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }
  const parsed = parseCoachChatBody(body);
  if (!parsed.ok) {
    return json({ error: parsed.error }, 400);
  }
  const input: CoachChatUserMessageInput = parsed.data;

  // 3. OpenAI client — key lives server-side only. Unset key → 500
  //    with a plain body (the client maps it to a friendly state).
  let openai: OpenAI;
  try {
    openai = getOpenAI();
  } catch {
    console.error("[api/coach/chat] OPENAI_API_KEY is not configured.");
    return json({ error: "The coaching service is not configured." }, 500);
  }

  // 4. Completion with a server-side time bound (client aborts at 15 s).
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), COACH_CALL_TIMEOUT_MS);
  try {
    const completion = await openai.chat.completions.create(
      {
        model: "gpt-4o-mini",
        temperature: 0.3,
        max_tokens: COACH_MAX_TOKENS,
        messages: [
          {
            role: "system",
            content: buildCoachSystemPrompt(input.blueprintContext?.relationshipMode),
          },
          { role: "user", content: buildCoachUserMessage(input) },
        ],
      },
      { signal: controller.signal },
    );

    const content = completion.choices?.[0]?.message?.content;
    if (!content || content.trim().length === 0) {
      console.error("[api/coach/chat] OpenAI returned an empty completion.");
      return json({ error: "The coaching service is temporarily unavailable. Please try again." }, 500);
    }

    // 5. Echo NOTHING beyond the coach reply.
    return json({ content }, 200);
  } catch (err) {
    // Never log conversation content — only the failure kind.
    console.error(
      "[api/coach/chat] OpenAI call failed:",
      err instanceof Error ? err.message : String(err),
    );
    return json({ error: "The coaching service is temporarily unavailable. Please try again." }, 500);
  } finally {
    clearTimeout(timer);
  }
}
