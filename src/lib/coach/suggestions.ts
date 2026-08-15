// ──────────────────────────────────────────────────────────────
// SolidGround AI — Coach Suggested Prompts
// ──────────────────────────────────────────────────────────────
// Static conversation starters for the web coach UI, mirroring the
// mobile client's general suggestions (lib/coach/suggestions.ts).
// Pure copy only — no data access, no server-only imports.
//
// Blueprint-personalized prompts are a mobile-only nicety for now:
// the web server actions expose no blueprint-context reader, and
// this UI deliberately stays behind the existing action surface.
// ──────────────────────────────────────────────────────────────

export interface CoachSuggestion {
  id: string;
  prompt: string;
}

/** The 7 general conversation starters (copy matches the mobile app). */
export const COACH_GENERAL_SUGGESTIONS: CoachSuggestion[] = [
  {
    id: "general-communication",
    prompt: "How do I bring up a sensitive topic with my partner without it turning into a fight?",
  },
  {
    id: "general-finances",
    prompt: "How can we talk about money and spending habits without tension?",
  },
  {
    id: "general-family",
    prompt: "How do we handle family expectations when we see them differently?",
  },
  {
    id: "general-values",
    prompt: "How do we figure out whether our core values actually align?",
  },
  {
    id: "general-lifestyle",
    prompt: "Our daily rhythms are different — how do we find a routine that works for both of us?",
  },
  {
    id: "general-life-goals",
    prompt: "What should we discuss about the future before we take the next step?",
  },
  {
    id: "general-growth",
    prompt: "How do we keep growing together instead of drifting apart?",
  },
];

/** Deterministic general prompt list (the brief's 7 topic examples). */
export function getGeneralSuggestions(): CoachSuggestion[] {
  return COACH_GENERAL_SUGGESTIONS;
}
