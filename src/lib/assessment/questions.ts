// ──────────────────────────────────────────────────────────────
// SolidGround AI — Compatibility Blueprint™ Question Bank
// 88 questions across 12 categories.
// ──────────────────────────────────────────────────────────────

import type { AssessmentCategory, AssessmentQuestion } from "@/types";

// ── Category metadata ─────────────────────────────────────────

export const CATEGORY_ORDER: AssessmentCategory[] = [
  "core_values",
  "communication",
  "lifestyle",
  "money",
  "career",
  "family",
  "children",
  "conflict_resolution",
  "health_wellness",
  "personal_growth",
  "social_life",
  "long_term_vision",
];

export const CATEGORY_DESCRIPTIONS: Record<AssessmentCategory, string> = {
  core_values: "Honesty, integrity, loyalty, and the principles that guide your life",
  communication: "How you express needs, handle conflict, and build emotional connection",
  lifestyle: "Daily rhythms, social preferences, and how you shape your environment",
  money: "Spending habits, saving, and what financial security means to you",
  career: "Work-life balance, ambition, and your professional identity",
  family: "Extended family relationships, boundaries, and involvement",
  children: "Your views on having, raising, and parenting children",
  conflict_resolution: "How you navigate disagreements and repair after arguments",
  health_wellness: "Physical fitness, mental health, and overall well-being priorities",
  personal_growth: "Self-improvement, learning, and evolving as individuals — and together",
  social_life: "Friendships, solitude, and how you spend your social energy",
  long_term_vision: "Life goals, retirement, and the future you're building toward",
};

export const CATEGORY_LABELS: Record<AssessmentCategory, string> = {
  core_values: "Core Values",
  communication: "Communication",
  lifestyle: "Lifestyle",
  money: "Money & Finances",
  career: "Career & Ambition",
  family: "Family",
  children: "Children & Parenting",
  conflict_resolution: "Conflict Resolution",
  health_wellness: "Health & Wellness",
  personal_growth: "Personal Growth",
  social_life: "Social Life",
  long_term_vision: "Long-Term Vision",
};

// ── Question bank ─────────────────────────────────────────────
// 88 questions total. Distribution:
//   core_values: 8, communication: 8, lifestyle: 8, money: 8,
//   career: 8, family: 8, children: 7, conflict_resolution: 7,
//   health_wellness: 7, personal_growth: 6, social_life: 6,
//   long_term_vision: 7

export const QUESTIONS: AssessmentQuestion[] = [
  // ── Core Values (8) ───────────────────────────────────────
  {
    id: "core_values_01",
    category: "core_values",
    text: "Honesty is more important than sparing your partner's feelings.",
    type: "likert_5",
  },
  {
    id: "core_values_02",
    category: "core_values",
    text: "I would end a relationship if my partner's core values fundamentally differed from mine.",
    type: "likert_5",
  },
  {
    id: "core_values_03",
    category: "core_values",
    text: "Religious or spiritual compatibility is essential for a long-term relationship.",
    type: "likert_5",
  },
  {
    id: "core_values_04",
    category: "core_values",
    text: "I believe in complete transparency — partners should have open access to each other's phones and accounts.",
    type: "likert_5",
  },
  {
    id: "core_values_05",
    category: "core_values",
    text: "A shared sense of humor is non-negotiable in a relationship.",
    type: "likert_5",
  },
  {
    id: "core_values_06",
    category: "core_values",
    text: "Loyalty means defending your partner publicly, even when you disagree privately.",
    type: "likert_5",
  },
  {
    id: "core_values_07",
    category: "core_values",
    text: "I value stability and predictability more than spontaneity and adventure in a partnership.",
    type: "likert_5",
  },
  {
    id: "core_values_08",
    category: "core_values",
    text: "Personal integrity — keeping promises and following through — is the most important trait in a partner.",
    type: "likert_5",
  },

  // ── Communication (8) ────────────────────────────────────
  {
    id: "communication_01",
    category: "communication",
    text: "I prefer to address relationship issues as soon as they arise.",
    type: "likert_5",
  },
  {
    id: "communication_02",
    category: "communication",
    text: "My partner should be able to intuit my needs without me always having to verbalize them.",
    type: "likert_5",
  },
  {
    id: "communication_03",
    category: "communication",
    text: "When my partner shares a problem, I immediately look for solutions rather than just listening.",
    type: "likert_5",
  },
  {
    id: "communication_04",
    category: "communication",
    text: "I find it easy to express affection and appreciation verbally.",
    type: "likert_5",
  },
  {
    id: "communication_05",
    category: "communication",
    text: "I shut down or withdraw during heated arguments.",
    type: "likert_5",
  },
  {
    id: "communication_06",
    category: "communication",
    text: "I am comfortable initiating difficult conversations about our relationship.",
    type: "likert_5",
  },
  {
    id: "communication_07",
    category: "communication",
    text: "I believe texting frequency is a meaningful indicator of interest and commitment.",
    type: "likert_5",
  },
  {
    id: "communication_08",
    category: "communication",
    text: "When I'm upset, I need space to process before discussing what's wrong.",
    type: "likert_5",
  },

  // ── Lifestyle (8) ────────────────────────────────────────
  {
    id: "lifestyle_01",
    category: "lifestyle",
    text: "I prefer an active social calendar with frequent outings and gatherings.",
    type: "likert_5",
  },
  {
    id: "lifestyle_02",
    category: "lifestyle",
    text: "A clean and organized living space is essential for my mental well-being.",
    type: "likert_5",
  },
  {
    id: "lifestyle_03",
    category: "lifestyle",
    text: "I am a night owl — I prefer late nights to early mornings.",
    type: "likert_5",
  },
  {
    id: "lifestyle_04",
    category: "lifestyle",
    text: "Travel and new experiences are a priority in how I want to spend my time and money.",
    type: "likert_5",
  },
  {
    id: "lifestyle_05",
    category: "lifestyle",
    text: "I need regular solitude and alone time to recharge.",
    type: "likert_5",
  },
  {
    id: "lifestyle_06",
    category: "lifestyle",
    text: "I prefer a predictable daily routine over variety and spontaneity.",
    type: "likert_5",
  },
  {
    id: "lifestyle_07",
    category: "lifestyle",
    text: "Screen time — phones, TV, gaming — is a significant part of my daily downtime.",
    type: "likert_5",
  },
  {
    id: "lifestyle_08",
    category: "lifestyle",
    text: "I would relocate for a partner's career or lifestyle preferences.",
    type: "likert_5",
  },

  // ── Money & Finances (8) ─────────────────────────────────
  {
    id: "money_01",
    category: "money",
    text: "How do you typically approach major financial decisions?",
    type: "single_choice",
    options: [
      { value: "independent", label: "I make them independently" },
      { value: "joint", label: "I prefer to make them jointly with a partner" },
      { value: "advisor", label: "I consult a financial advisor" },
      { value: "research", label: "I research extensively before deciding" },
    ],
  },
  {
    id: "money_02",
    category: "money",
    text: "I maintain a detailed budget and track my spending closely.",
    type: "likert_5",
  },
  {
    id: "money_03",
    category: "money",
    text: "Debt — outside of a mortgage or student loans — is something I'm fundamentally uncomfortable with.",
    type: "likert_5",
  },
  {
    id: "money_04",
    category: "money",
    text: "I believe couples should keep separate bank accounts for personal spending.",
    type: "likert_5",
  },
  {
    id: "money_05",
    category: "money",
    text: "I would sign a prenuptial agreement if asked.",
    type: "likert_5",
  },
  {
    id: "money_06",
    category: "money",
    text: "Supporting family members financially is a responsibility I expect to carry.",
    type: "likert_5",
  },
  {
    id: "money_07",
    category: "money",
    text: "I prioritize saving for the future over enjoying the present.",
    type: "likert_5",
  },
  {
    id: "money_08",
    category: "money",
    text: "I am comfortable with my partner earning significantly more or less than I do.",
    type: "likert_5",
  },

  // ── Career & Ambition (8) ────────────────────────────────
  {
    id: "career_01",
    category: "career",
    text: "My career is a core part of my identity, not just a source of income.",
    type: "likert_5",
  },
  {
    id: "career_02",
    category: "career",
    text: "A partner's career ambition should match or complement my own.",
    type: "likert_5",
  },
  {
    id: "career_03",
    category: "career",
    text: "I would sacrifice career advancement for the health of my relationship.",
    type: "likert_5",
  },
  {
    id: "career_04",
    category: "career",
    text: "I expect a partner to understand and accommodate my work hours, even when they're demanding.",
    type: "likert_5",
  },
  {
    id: "career_05",
    category: "career",
    text: "Geographic mobility for career opportunities is important to me.",
    type: "likert_5",
  },
  {
    id: "career_06",
    category: "career",
    text: "I believe household and childcare responsibilities should be split 50/50 regardless of who earns more.",
    type: "likert_5",
  },
  {
    id: "career_07",
    category: "career",
    text: "I am willing to be the primary breadwinner while a partner stays home — with children or otherwise.",
    type: "likert_5",
  },
  {
    id: "career_08",
    category: "career",
    text: "Work stress follows me home — it's hard for me to fully disconnect in the evenings.",
    type: "likert_5",
  },

  // ── Family (8) ───────────────────────────────────────────
  {
    id: "family_01",
    category: "family",
    text: "Family approval of my partner matters to me.",
    type: "likert_5",
  },
  {
    id: "family_02",
    category: "family",
    text: "I expect to spend major holidays with my partner's extended family.",
    type: "likert_5",
  },
  {
    id: "family_03",
    category: "family",
    text: "I would feel uncomfortable if my partner had a very close or dependent relationship with their parents.",
    type: "likert_5",
  },
  {
    id: "family_04",
    category: "family",
    text: "My family of origin will always come first, even after marriage.",
    type: "likert_5",
  },
  {
    id: "family_05",
    category: "family",
    text: "I am open to a partner who has a complicated or estranged relationship with their family.",
    type: "likert_5",
  },
  {
    id: "family_06",
    category: "family",
    text: "I expect aging parents to live with us someday rather than in assisted care.",
    type: "likert_5",
  },
  {
    id: "family_07",
    category: "family",
    text: "I believe the needs of our nuclear family should take priority over extended family obligations.",
    type: "likert_5",
  },
  {
    id: "family_08",
    category: "family",
    text: "I would relocate to be closer to family.",
    type: "likert_5",
  },

  // ── Children & Parenting (7) ─────────────────────────────
  {
    id: "children_01",
    category: "children",
    text: "I want children within the next 5 years.",
    type: "likert_5",
  },
  {
    id: "children_02",
    category: "children",
    text: "I would consider adoption or fostering as a path to parenthood.",
    type: "likert_5",
  },
  {
    id: "children_03",
    category: "children",
    text: "I believe one parent should stay home during the early years of a child's life.",
    type: "likert_5",
  },
  {
    id: "children_04",
    category: "children",
    text: "I am comfortable with a partner who does not want children.",
    type: "likert_5",
  },
  {
    id: "children_05",
    category: "children",
    text: "How many children would you ideally want?",
    type: "single_choice",
    options: [
      { value: "none", label: "None" },
      { value: "one", label: "One" },
      { value: "two", label: "Two" },
      { value: "three_plus", label: "Three or more" },
      { value: "undecided", label: "I'm genuinely undecided" },
    ],
  },
  {
    id: "children_06",
    category: "children",
    text: "I have strong opinions about parenting approaches — discipline, education, screen time — that I'd expect a partner to align with.",
    type: "likert_5",
  },
  {
    id: "children_07",
    category: "children",
    text: "I would consider fertility treatments or surrogacy if needed to have children.",
    type: "likert_5",
  },

  // ── Conflict Resolution (7) ──────────────────────────────
  {
    id: "conflict_resolution_01",
    category: "conflict_resolution",
    text: "I prefer to resolve disagreements immediately, even if emotions are high.",
    type: "likert_5",
  },
  {
    id: "conflict_resolution_02",
    category: "conflict_resolution",
    text: "I can stay calm and constructive when my partner criticizes me.",
    type: "likert_5",
  },
  {
    id: "conflict_resolution_03",
    category: "conflict_resolution",
    text: "During an argument, I sometimes say things I later regret.",
    type: "likert_5",
  },
  {
    id: "conflict_resolution_04",
    category: "conflict_resolution",
    text: "I am willing to compromise on issues I feel strongly about if it resolves a conflict.",
    type: "likert_5",
  },
  {
    id: "conflict_resolution_05",
    category: "conflict_resolution",
    text: "Winning an argument is less important than preserving the relationship.",
    type: "likert_5",
  },
  {
    id: "conflict_resolution_06",
    category: "conflict_resolution",
    text: "I hold grudges after serious arguments.",
    type: "likert_5",
  },
  {
    id: "conflict_resolution_07",
    category: "conflict_resolution",
    text: "I would seek couples therapy before considering separation.",
    type: "likert_5",
  },

  // ── Health & Wellness (7) ────────────────────────────────
  {
    id: "health_wellness_01",
    category: "health_wellness",
    text: "Physical fitness and exercise are a regular part of my life.",
    type: "likert_5",
  },
  {
    id: "health_wellness_02",
    category: "health_wellness",
    text: "I follow a specific diet — vegetarian, keto, etc. — and prefer a partner who eats similarly.",
    type: "likert_5",
  },
  {
    id: "health_wellness_03",
    category: "health_wellness",
    text: "Mental health — therapy, meditation, self-care — is an active priority for me.",
    type: "likert_5",
  },
  {
    id: "health_wellness_04",
    category: "health_wellness",
    text: "I use alcohol regularly (several times per week).",
    type: "likert_5",
  },
  {
    id: "health_wellness_05",
    category: "health_wellness",
    text: "I would struggle to be with a partner who doesn't prioritize their physical health.",
    type: "likert_5",
  },
  {
    id: "health_wellness_06",
    category: "health_wellness",
    text: "How would you describe your overall approach to health and wellness?",
    type: "single_choice",
    options: [
      { value: "proactive", label: "I'm very proactive about my health" },
      { value: "basics", label: "I take care of the basics" },
      { value: "moderate", label: "I'm moderately health-conscious" },
      { value: "not_focus", label: "Health isn't a major focus for me right now" },
    ],
  },
  {
    id: "health_wellness_07",
    category: "health_wellness",
    text: "I am comfortable discussing mental health struggles openly with a partner.",
    type: "likert_5",
  },

  // ── Personal Growth (6) ──────────────────────────────────
  {
    id: "personal_growth_01",
    category: "personal_growth",
    text: "I regularly set personal goals and track progress toward them.",
    type: "likert_5",
  },
  {
    id: "personal_growth_02",
    category: "personal_growth",
    text: "I believe people can fundamentally change who they are with enough effort.",
    type: "likert_5",
  },
  {
    id: "personal_growth_03",
    category: "personal_growth",
    text: "I seek out feedback — even uncomfortable feedback — about myself from people close to me.",
    type: "likert_5",
  },
  {
    id: "personal_growth_04",
    category: "personal_growth",
    text: "I am actively working on becoming a better version of myself.",
    type: "likert_5",
  },
  {
    id: "personal_growth_05",
    category: "personal_growth",
    text: "A partner should challenge me intellectually and push me to grow.",
    type: "likert_5",
  },
  {
    id: "personal_growth_06",
    category: "personal_growth",
    text: "I read books or consume content specifically aimed at self-improvement.",
    type: "likert_5",
  },

  // ── Social Life (6) ──────────────────────────────────────
  {
    id: "social_life_01",
    category: "social_life",
    text: "I expect my partner to be my primary social companion for most activities.",
    type: "likert_5",
  },
  {
    id: "social_life_02",
    category: "social_life",
    text: "I maintain close friendships independent of my romantic relationship.",
    type: "likert_5",
  },
  {
    id: "social_life_03",
    category: "social_life",
    text: "I would be uncomfortable if my partner regularly socialized one-on-one with someone of the gender they're attracted to.",
    type: "likert_5",
  },
  {
    id: "social_life_04",
    category: "social_life",
    text: "How do you prefer to spend your weekends?",
    type: "single_choice",
    options: [
      { value: "quiet", label: "Quiet and low-key at home" },
      { value: "balanced", label: "A balance of social and personal time" },
      { value: "active", label: "Active and social — seeing friends, going out" },
      { value: "adventuring", label: "Exploring, adventuring, traveling" },
    ],
  },
  {
    id: "social_life_05",
    category: "social_life",
    text: "I am comfortable attending social events alone when my partner isn't interested.",
    type: "likert_5",
  },
  {
    id: "social_life_06",
    category: "social_life",
    text: "I need regular time with my own friends — without my partner present.",
    type: "likert_5",
  },

  // ── Long-Term Vision (7) ─────────────────────────────────
  {
    id: "long_term_vision_01",
    category: "long_term_vision",
    text: "Where I live long-term — city, suburb, rural — is a key part of my life vision.",
    type: "likert_5",
  },
  {
    id: "long_term_vision_02",
    category: "long_term_vision",
    text: "I have a clear picture of what I want my life to look like in 10 years.",
    type: "likert_5",
  },
  {
    id: "long_term_vision_03",
    category: "long_term_vision",
    text: "I would prioritize building wealth and financial independence over pursuing passions.",
    type: "likert_5",
  },
  {
    id: "long_term_vision_04",
    category: "long_term_vision",
    text: "I see retirement as a time to slow down and enjoy a quieter pace of life.",
    type: "likert_5",
  },
  {
    id: "long_term_vision_05",
    category: "long_term_vision",
    text: "I want to leave a meaningful legacy — through work, community, or creative contribution.",
    type: "likert_5",
  },
  {
    id: "long_term_vision_06",
    category: "long_term_vision",
    text: "I am open to living abroad or in a different country for a significant period.",
    type: "likert_5",
  },
  {
    id: "long_term_vision_07",
    category: "long_term_vision",
    text: "A shared long-term vision matters more to me than day-to-day compatibility.",
    type: "likert_5",
  },
];

// ── Validation ────────────────────────────────────────────────
// Build a set for fast question-id lookups.
const QUESTION_ID_SET = new Set(QUESTIONS.map((q) => q.id));

if (QUESTION_ID_SET.size !== QUESTIONS.length) {
  throw new Error("Duplicate question IDs detected in question bank.");
}

// ── Question lookup map (for O(1) access) ────────────────────
const QUESTIONS_BY_ID = new Map<string, AssessmentQuestion>();
for (const q of QUESTIONS) {
  QUESTIONS_BY_ID.set(q.id, q);
}

// ── Helper functions ──────────────────────────────────────────

/** Get all questions for a given category, in order. */
export function getQuestionsByCategory(
  category: AssessmentCategory,
): AssessmentQuestion[] {
  return QUESTIONS.filter((q) => q.category === category);
}

/** Get a single question by its ID. */
export function getQuestionById(id: string): AssessmentQuestion | undefined {
  return QUESTIONS_BY_ID.get(id);
}

/** Compute progress for a single category. */
export function getCategoryProgress(
  category: AssessmentCategory,
  answeredQuestionIds: Set<string>,
): { total: number; answered: number } {
  const questions = getQuestionsByCategory(category);
  const answered = questions.filter((q) => answeredQuestionIds.has(q.id)).length;
  return { total: questions.length, answered };
}

/** Compute overall assessment progress. */
export function getTotalProgress(
  answeredQuestionIds: Set<string>,
): { total: number; answered: number; percentage: number } {
  const total = QUESTIONS.length;
  const answered = QUESTIONS.filter((q) => answeredQuestionIds.has(q.id)).length;
  const percentage = total > 0 ? Math.round((answered / total) * 100) : 0;
  return { total, answered, percentage };
}

/** Validate that a question_id exists in the bank. */
export function isValidQuestionId(id: string): boolean {
  return QUESTION_ID_SET.has(id);
}
