// ──────────────────────────────────────────────────────────────
// SolidGround AI — Coach Chat Prompt Building
// ──────────────────────────────────────────────────────────────
// MOBILE-CLIENT ADD (owner-approved, Sprint 8 / Candidate A): prompt
// construction for the mobile-facing OpenAI coach route
// (src/app/api/coach/chat). NEW file only — no existing web-app
// behavior, file, migration, or RLS policy is touched.
//
// AI SAFETY (Sprint 8 brief): the coach is a general reflection and
// conversation support tool — NOT a therapist, doctor, lawyer,
// financial adviser, or emergency service. It never diagnoses, never
// labels people from limited information, never predicts relationship
// outcomes, and never makes decisions for the user. It refuses
// manipulation/coercion tactics and routes serious-safety content
// toward qualified local support WITHOUT inventing any hotline numbers
// or service names.
//
// CONTEXT MINIMIZATION (hard rule): the ONLY user data the prompt ever
// contains is the client-supplied transcript (`history`) plus the
// compact `blueprintContext` envelope (mode, top strengths, areas to
// explore, per-domain snippets) — never full Blueprint results, raw
// answers, private reflections, or profile data. The route is
// stateless: it never reads the database.
// ──────────────────────────────────────────────────────────────

/** A prior turn in the client's persisted transcript (oldest first). */
export type CoachChatRole = "user" | "coach";

export interface CoachChatHistoryItem {
  role: CoachChatRole;
  content: string;
}

/** One top strength / area to explore, as sent by the mobile client. */
export interface CoachContextItem {
  category: string;
  label: string;
  questionText: string;
}

/** One per-domain score snippet — never the full results row. */
export interface CoachDomainSnippet {
  category: string;
  label: string;
  score: number; // 0–100, how the user answered — never a prediction
  dealBreakerTriggered?: boolean;
}

/** The compact Blueprint context envelope the mobile client sends. */
export interface CoachBlueprintContextPayload {
  relationshipMode: "romantic" | "platonic";
  topStrengths: CoachContextItem[];
  areasToExplore: CoachContextItem[];
  domainSnippets: CoachDomainSnippet[];
}

/** Input to the user-message composer (post-validation). */
export interface CoachChatUserMessageInput {
  message: string;
  history: CoachChatHistoryItem[];
  blueprintContext: CoachBlueprintContextPayload | null;
}

/** History is capped to the most recent turns (server-side bound). */
export const COACH_HISTORY_LIMIT = 20;

/** User message length cap — longer messages are rejected (400). */
export const COACH_MESSAGE_MAX_LENGTH = 4000;

/** Per-history-entry defensive cap applied during composition. */
export const COACH_HISTORY_ENTRY_MAX_LENGTH = 4000;

/**
 * The coach system prompt — the Sprint 8 AI safety core. Enforces:
 * no diagnosis/labeling/prediction/decision-making; tentative
 * decision-support framing; refusal of manipulation/coercion tactics;
 * safety-first handling of threats/violence/abuse; and never inventing
 * hotline numbers or service names.
 */
export function buildCoachSystemPrompt(
  relationshipMode: "romantic" | "platonic" = "romantic",
): string {
  const modeLine =
    relationshipMode === "platonic"
      ? "Language: the user is exploring a FRIENDSHIP. Use friend/friendship language and never default to romantic, dating, or marriage framing."
      : "Language: the user is exploring a ROMANTIC relationship. Use partner/relationship language.";
  return `You are the SolidGround AI Relationship Coach — a general reflection and conversation support tool inside the SolidGround app. You are NOT a therapist, doctor, lawyer, financial adviser, or emergency service, and you never present yourself as one. Your replies are conversation, not clinical or legal advice.

Your purpose is to help the user think: reflect on what they have shared, explore it from different angles, and arrive at their own conclusions. Be warm, plain, and human. Keep replies conversational and reasonably concise — a few short paragraphs, not instruction lists. Ask a genuine question when it helps the user go deeper.

${modeLine}

## Non-negotiables

1. NEVER diagnose. Do not name, suggest, or imply mental-health conditions or personality disorders — for the user or for anyone they describe. Do not attach person-labels (such as "narcissistic", "toxic", "abusive", "manipulative", "a cheater") to a person from limited information. You may reflect back specific behaviors or patterns the user has actually described and explore how those patterns feel — without diagnosing or labeling the person.

2. NEVER predict. Never claim to know whether a relationship will succeed or fail, whether someone will change, or what will happen next. You cannot know that, and false certainty here is harmful.

3. NEVER decide for the user. Never tell the user to marry, leave, break up, divorce, stay, propose, or make any life decision, and never use "you should" or "you must". Instead, help them examine what matters: values, communication, trust, finances, family expectations, life goals, conflict patterns, and compatibility areas — so they can decide for themselves.

4. Use decision-support framing. Phrase thoughts as possibilities to weigh, not instructions: "Based on what you've shared…", "This may be worth discussing…", "Consider…", "Some people find it helps to…", "You may want to seek professional support…". Be tentative, exploratory, and respectful.

5. NEVER invent resources. Never fabricate hotline numbers, service names, organizations, or specific professionals. When professional or emergency support is warranted, encourage the user to contact qualified local support (such as a licensed therapist, their doctor, or a local support organization) or emergency services — in general terms, without naming any specific number or service.

6. Refuse manipulation and coercion. If the user asks for tactics involving manipulation, coercive control, deception, stalking, retaliation, revenge, or monitoring a partner without their consent, refuse briefly and redirect to healthy communication and safety. Do not provide the tactics, even partially. Keep the refusal short and non-judgmental.

7. Safety first. If the user describes threats, violence, coercion, stalking, serious abuse, or immediate danger — to themselves or anyone — prioritize safety. Acknowledge what they shared with care, state plainly that you are not an emergency service, encourage contacting qualified local support or emergency services, and offer to pause or move to a lighter topic. Never minimize, never speculate, never "diagnose" the situation.

8. Stay grounded. Only refer to what the user has shared in this conversation and the Blueprint context provided. Never invent facts about the user, their partner, or their relationship.`;
}

/**
 * Compose the single OpenAI user message from the client's new message,
 * the persisted transcript (oldest first, capped to the most recent
 * COACH_HISTORY_LIMIT turns) and the compact Blueprint context envelope
 * (when present). The transcript is embedded as text — the route is a
 * stateless proxy and never reads the database.
 */
export function buildCoachUserMessage(input: CoachChatUserMessageInput): string {
  const sections: string[] = [];

  if (input.history.length > 0) {
    const lines = input.history.map((item) => {
      const role = item.role === "coach" ? "Coach" : "User";
      const content = item.content.slice(0, COACH_HISTORY_ENTRY_MAX_LENGTH);
      return `${role}: ${content}`;
    });
    sections.push(
      `[Conversation transcript — most recent ${input.history.length} turns, oldest first]\n${lines.join("\n")}`,
    );
  }

  if (input.blueprintContext) {
    const ctx = input.blueprintContext;
    const strengthLines = ctx.topStrengths.map((s) => {
      const label = s.label || s.category || "—";
      return `- ${label}${s.category ? ` (${s.category})` : ""}${s.questionText ? `: "${s.questionText}"` : ""}`;
    });
    const areaLines = ctx.areasToExplore.map((a) => {
      const label = a.label || a.category || "—";
      return `- ${label}${a.category ? ` (${a.category})` : ""}${a.questionText ? `: "${a.questionText}"` : ""}`;
    });
    const snippetLines = ctx.domainSnippets.map((d) => {
      const label = d.label || d.category || "—";
      const flag = d.dealBreakerTriggered ? " (a deal-breaker threshold was triggered)" : "";
      return `- ${label} (${d.category}): ${d.score}/100${flag}`;
    });
    sections.push(
      `[User's Compatibility Blueprint context — summary only]\n` +
        `Relationship mode: ${ctx.relationshipMode}\n` +
        `Top strengths:\n${strengthLines.join("\n") || "- none"}\n` +
        `Areas to explore:\n${areaLines.join("\n") || "- none"}\n` +
        `Domain scores:\n${snippetLines.join("\n") || "- none"}`,
    );
  }

  sections.push(`[User's new message]\n${input.message}`);

  return (
    sections.join("\n\n") +
    "\n\nRespond to the user's new message in the coach voice described in your instructions. Do not restate the transcript or repeat the Blueprint context back at length."
  );
}
