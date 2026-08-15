// ──────────────────────────────────────────────────────────────
// SolidGround AI — Coach Reply Generation (shared)
// ──────────────────────────────────────────────────────────────
// The "generate a coach reply for one turn" logic shared by BOTH
// consumers:
//   • the mobile-facing API route (src/app/api/coach/chat/route.ts)
//   • the web app's coach server actions (src/lib/coach/actions.ts)
//
// MODE SELECTION — mirrors the AI-insights provider abstraction
// (src/lib/ai/providerFactory.ts): when the provider mode is "mock"
// (NEXT_PUBLIC_AI_MODE=mock) OR no OPENAI_API_KEY is configured, the
// coach returns a deterministic, offline mock reply (status 200)
// instead of erroring. Otherwise it calls OpenAI gpt-4o-mini exactly
// as the original route did — the live path is unchanged.
//
// MOCK CONTRACT:
//   • Deterministic — the same (message, blueprintContext) always
//     produces byte-identical output. No randomness, no Date.now.
//   • Message-derived — echoes a significant word/phrase the user
//     actually used and asks a topic-aware follow-up question, so it
//     is never a canned constant.
//   • Safety-respecting — encodes the same Sprint 8 non-negotiables
//     as buildCoachSystemPrompt(): no diagnosis, no person-labels,
//     no outcome prediction, no decisions for the user (no "you
//     should"/"you must"), no invented hotline numbers or service
//     names, safety-first handling of danger/abuse/self-harm, and no
//     facts about the user beyond what they just wrote.
//   • Mode-aware — uses partner/friend language from the
//     blueprintContext relationshipMode (defaults to partner).
// ──────────────────────────────────────────────────────────────

// NOTE: getOpenAI is dynamically imported inside openAICoachReply() —
// never at module top. Importing coach-reply must NOT evaluate
// service.ts (and therefore providerFactory.ts, which fixes its
// singleton at module load from NEXT_PUBLIC_AI_MODE). Tests rely on
// setting that env var before a DYNAMIC import of the factory, so the
// static import chain must stay free of service.ts.
import {
  buildCoachSystemPrompt,
  buildCoachUserMessage,
  type CoachChatUserMessageInput,
} from "./coach-prompt";

/** Server-side bound on the OpenAI call — the client aborts at 15 s. */
export const COACH_CALL_TIMEOUT_MS = 12_000;

/** Max completion tokens for a coach reply (a few short paragraphs). */
export const COACH_MAX_TOKENS = 800;

/**
 * True when the coach should use the deterministic mock: the provider
 * mode is "mock" (NEXT_PUBLIC_AI_MODE) OR no OpenAI key is configured.
 * Read at call time so tests (and env changes) can toggle it freely.
 */
export function isMockCoachMode(): boolean {
  return process.env.NEXT_PUBLIC_AI_MODE === "mock" || !process.env.OPENAI_API_KEY;
}

/**
 * Generate one coach reply for a turn. Mock mode → deterministic mock;
 * live mode → OpenAI gpt-4o-mini completion. Live-mode failures
 * propagate to the caller (the route maps them to a 500, the server
 * action to an error result) — they are never swallowed here.
 */
export async function generateCoachReply(input: CoachChatUserMessageInput): Promise<string> {
  if (isMockCoachMode()) return mockCoachReply(input);
  return openAICoachReply(input);
}

// ── Live path (unchanged behavior) ─────────────────────────────

async function openAICoachReply(input: CoachChatUserMessageInput): Promise<string> {
  // Lazy import: keeps service.ts/providerFactory out of the module
  // graph until a live reply is actually requested.
  const { getOpenAI } = await import("@/lib/ai/service");
  const openai = getOpenAI();
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
      throw new Error("OpenAI returned an empty completion.");
    }
    return content;
  } finally {
    clearTimeout(timer);
  }
}

// ── Mock path (deterministic, offline, keyless) ────────────────

export type CoachSafetyConcern = "danger" | "self-harm";

/**
 * Documented keyword heuristics for serious danger/abuse/self-harm.
 * Case-insensitive substring matching on the lowercased message.
 * Deliberately conservative: any hit routes to the safety response,
 * which never diagnoses and never pretends to be an emergency service.
 */
const SAFETY_KEYWORDS: ReadonlyArray<{ concern: CoachSafetyConcern; keywords: readonly string[] }> = [
  {
    concern: "self-harm",
    keywords: [
      "suicide", "suicidal", "kill myself", "end my life", "end my own life",
      "self-harm", "self harm", "selfharm", "cutting myself", "hurt myself",
      "want to die", "wish i was dead", "better off dead", "don't want to be here",
      "dont want to be here", "no reason to live",
    ],
  },
  {
    concern: "danger",
    keywords: [
      "abuse", "abusive", "hit me", "hitting me", "slap", "punch", "push me",
      "threaten", "threatened", "threats", "scared of", "afraid of", "hurt me",
      "assault", "stalk", "stalking", "violent", "violence", "beat me",
      "beating", "forced me", "controlling", "trapped", "kill him", "kill her",
      "want to hurt", "going to hurt", "weapon",
    ],
  },
];

/** Returns the first safety concern matched, or null when none matched. */
export function detectCoachSafetyConcern(message: string): CoachSafetyConcern | null {
  const lower = message.toLowerCase();
  for (const row of SAFETY_KEYWORDS) {
    if (row.keywords.some((keyword) => lower.includes(keyword))) {
      return row.concern;
    }
  }
  return null;
}

/**
 * Heuristics for manipulation/coercion requests (coach-prompt
 * non-negotiable #6). Deliberately conservative: any hit routes to the
 * brief refusal — the mock never provides the tactics, even partially.
 */
const MANIPULATION_KEYWORDS: readonly string[] = [
  "manipulat", "coerc", "gaslight", "stalking", "stalk ", "revenge", "retaliat",
  "blackmail", "deception", "deceive", "deceit", "trick", "spy on", "monitor their",
  "track their", "control her", "control him", "make her jealous", "make him jealous",
  "make them jealous", "jealousy tactic",
];

/** True when the message reads as a manipulation/coercion request. */
export function detectCoachManipulation(message: string): boolean {
  const lower = message.toLowerCase();
  return MANIPULATION_KEYWORDS.some((keyword) => lower.includes(keyword));
}

/** Words too generic to echo back (deterministic echo anchor). */
const MOCK_ECHO_STOPWORDS = new Set([
  "the","and","but","for","nor","or","so","yet","to","of","in","on","at","by","with",
  "about","from","into","over","under","again","then","once","here","there","when",
  "where","why","how","all","any","both","each","few","more","most","other","some",
  "such","no","not","only","own","same","than","too","very","can","will","just",
  "should","would","could","may","might","must","shall","do","does","did","have",
  "has","had","am","are","is","was","were","be","been","being","you","he","she",
  "it","we","they","me","him","her","us","them","my","your","his","its","our",
  "their","this","that","these","those","what","which","who","whom","whose",
  "always","never","sometimes","often","really","actually","maybe","perhaps",
  "mean","means","says","said","say","tell","told","ask","asked","think","thinking",
  "thought","feel","feels","felt","feeling","want","wants","wanted","need","needs",
  "needed","talk","talking","talked","get","got","going","go","keep","keeps","kept",
  "one","two","thing","things","something","anything","everything","nothing","someone","somebody",
  "everyone","anyone","partner","friend","relationship","relationships",
]);

/**
 * First significant word the user used — the deterministic echo anchor
 * for the mock reply. Returns null when every word is a stopword.
 */
export function extractEchoWord(message: string): string | null {
  const words = message
    .toLowerCase()
    .replace(/[^a-z0-9'\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const word = words.find((w) => w.length > 3 && !MOCK_ECHO_STOPWORDS.has(w));
  return word ?? null;
}

/** One deterministic mock topic: keyword matcher + explore + question. */
interface MockTopic {
  topic: string;
  keywords: readonly string[];
  explore: string;
  question: string;
}

/**
 * Documented keyword → topic mapping for the mock follow-up question.
 * Case-insensitive substring matching on the lowercased message; the
 * FIRST matching row wins, so order matters (blueprint first, then the
 * concrete topics, general-relationship as the fallback).
 */
const MOCK_TOPICS: ReadonlyArray<MockTopic> = [
  {
    topic: "blueprint",
    keywords: [
      "blueprint", "my results", "my result", "my score", "my scores",
      "my strength", "my strengths", "my growth", "my areas", "area to explore",
      "areas to explore", "my report", "my assessment", "my answers",
      "my profile", "my dimension", "my category", "deal-breaker", "deal breaker",
    ],
    explore:
      "what your strongest areas and the ones flagged to explore might be telling you — your results are a mirror of how you answered, not a verdict on your relationship",
    question: "Which of your results stood out to you most, and what do you think it's pointing at?",
  },
  {
    topic: "communication",
    keywords: [
      "communicat", "talk", "talking", "listen", "listening", "argu", "fight",
      "conflict", "disagreement", "conversation", "express", "feel", "feelings",
      "emotion", "anger", "yell", "shout", "boundary", "boundaries", "needs",
    ],
    explore:
      "what usually happens right before the conversation gets tense, and what each of you is hoping the other would hear",
    question: "If your {partner} heard the need underneath your words, what would you want them to understand first?",
  },
  {
    topic: "money",
    keywords: [
      "money", "financ", "spend", "spending", "budget", "debt", "saving",
      "save", "income", "salary", "bills", "expense", "mortgage", "loan", "rent",
    ],
    explore:
      "what money meant in your family growing up, and what \"enough\" looks like to each of you",
    question: "What would a conversation about money need to feel safe for you to speak openly?",
  },
  {
    topic: "family",
    keywords: [
      "family", "parent", "parents", "in-law", "in laws", "sibling", "mother",
      "father", "kid", "kids", "children", "child", "grandparent", "cousin",
    ],
    explore:
      "which expectations each of you actually wants to honor, and which you would both be relieved to set aside",
    question: "What boundary would you most want to draw with your family, and who would communicate it?",
  },
  {
    topic: "values",
    keywords: [
      "value", "values", "honesty", "integrity", "loyalty", "religion", "faith",
      "politics", "belief", "beliefs", "principle", "principles", "morals", "ethic",
    ],
    explore:
      "which values are non-negotiable for each of you, and which are flexible",
    question: "How confident are you that you know what your {partner} would rank as their top three values?",
  },
  {
    topic: "lifestyle",
    keywords: [
      "lifestyle", "routine", "habit", "habits", "sleep", "clean", "messy",
      "introvert", "extrovert", "social life", "hobby", "hobbies", "weekend",
      "exercise", "diet", "home",
    ],
    explore:
      "which parts of your daily rhythms are flexible, and which are core to how you recharge",
    question: "What would a typical day look like if it worked well for both of you?",
  },
  {
    topic: "future",
    keywords: [
      "goal", "goals", "future", "marriage", "marry", "engagement", "retire",
      "retirement", "career", "ambition", "move", "relocate", "dream", "dreams",
      "long-term", "long term", "timeline",
    ],
    explore:
      "which of your goals have hard timelines and which are open-ended, and what each of you might be assuming about the other's plans",
    question: "What's one hope for the future you haven't said out loud to your {partner} yet?",
  },
  {
    topic: "growth",
    keywords: [
      "grow", "growth", "improve", "improving", "learn", "learning", "therapy",
      "change", "changing", "develop", "developing", "evolve", "healing", "pattern",
    ],
    explore:
      "what moving forward would actually look like week to week, not just in principle",
    question: "What's one small step you could take this week that would move things in the direction you want?",
  },
];

/** Deterministic topic classification of a user message (mock follow-up). */
export function classifyMockTopic(message: string): MockTopic {
  const lower = message.toLowerCase();
  for (const row of MOCK_TOPICS) {
    if (row.keywords.some((keyword) => lower.includes(keyword))) return row;
  }
  return {
    topic: "general",
    keywords: [],
    explore:
      "what each of you needs from this situation, and whether those needs have been said out loud",
    question: "If you could say one thing to your {partner} without fear of the reaction, what would it be?",
  };
}

/** Partner noun from context mode ('friend' for platonic), default 'partner'. */
function partnerNoun(input: CoachChatUserMessageInput): string {
  return input.blueprintContext?.relationshipMode === "platonic" ? "friend" : "partner";
}

/**
 * Safety response — routed before any topic handling. Never names a
 * specific hotline number or service (the app is used internationally;
 * a hardcoded number could be wrong). Points to LOCAL support in
 * general terms, states plainly it is not an emergency service.
 */
function buildMockSafetyReply(concern: CoachSafetyConcern): string {
  const supportLine =
    concern === "self-harm"
      ? "If you are thinking about harming yourself, please reach out to your local emergency services or a local crisis line right now — trained people answer, and they will listen without judgment."
      : "If you are in immediate danger — or worried you might be — please contact your local emergency services or a local domestic-violence or abuse support line. Trained advocates can help you think through your options safely, and they will believe you.";
  return (
    "Thank you for telling me this — it takes courage to put it into words. " +
    "I want to be clear about what I am: I'm an AI coaching companion, not a crisis or emergency service, and I'm not equipped to handle this the way you deserve. " +
    `${supportLine} ` +
    "You are not alone in this. Would you like to pause the coaching here, or move to a lighter topic you would feel safe exploring together?"
  );
}

/**
 * Deterministic mock coach reply. Safety first, then manipulation
 * refusal, then a message-derived reply: echoes a significant word the
 * user used and asks a topic-aware follow-up question in the
 * reflection-coach voice. Never fabricates facts about the user — the
 * only user data it references is the message itself and the
 * relationship mode.
 */
export function mockCoachReply(input: CoachChatUserMessageInput): string {
  const safety = detectCoachSafetyConcern(input.message);
  if (safety) return buildMockSafetyReply(safety);

  if (detectCoachManipulation(input.message)) {
    return (
      "That's something I can't help with — I won't offer tactics for manipulating, coercing, or controlling a partner, even in part. " +
      "What I can do is help you think through how to communicate openly and honestly about what you're feeling or needing. " +
      "Would that be useful?"
    );
  }

  const partner = partnerNoun(input);
  const topic = classifyMockTopic(input.message);
  const echo = extractEchoWord(input.message);

  const echoLine = echo
    ? `You mentioned "${echo}" — I'd like to understand what's underneath that for you, and what it's bringing up between you.`
    : "I'd like to understand what's underneath this for you, and what it's bringing up between you.";

  return [
    "Thank you for bringing this up — it sounds like it matters to you, and putting it into words is a good first step.",
    echoLine,
    `Worth exploring: ${topic.explore}.`,
    `A question to consider: ${topic.question.replace("{partner}", partner)}`,
  ].join("\n\n");
}
