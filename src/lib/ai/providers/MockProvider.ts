// ──────────────────────────────────────────────────────────────
// SolidGround AI — Mock AI Provider
// ──────────────────────────────────────────────────────────────
// Deterministic, offline AI insights generator for development,
// demos, and testing. Produces realistic, data-grounded insights
// from the assessment scores using business rules — it never
// calls an external API and never makes network requests.
// All content is derived from the actual Blueprint results.
// ──────────────────────────────────────────────────────────────

import type { BlueprintResults, CategoryResult } from "@/lib/scoring/types";
import type { AIInsights, RelationshipType } from "@/types";
import type { AIProvider } from "./types";

type ScoreTier = "high" | "moderate" | "developing";

/** Per-category strength phrasing used when a category ranks highly. */
const STRENGTH_PHRASES: Record<string, string> = {
  core_values: "you bring a clear, well-defined value system into relationships",
  communication: "you express yourself clearly and create space for honest dialogue",
  lifestyle: "you have a grounded, predictable rhythm that partners can rely on",
  money: "you approach finances with transparency and shared planning in mind",
  career: "you bring ambition and a sense of direction to the relationship",
  family: "you hold a thoughtful view of family roles and boundaries",
  children: "you have considered, realistic views on parenting",
  conflict_resolution: "you are equipped to de-escalate tension and repair after disagreements",
  health_wellness: "you prioritize wellbeing in a way that supports a sustainable partnership",
  personal_growth: "you are self-reflective and open to evolving",
  social_life: "you value connection and balance between togetherness and independence",
  long_term_vision: "you think ahead and can articulate what you want a shared future to look like",
};

/** Per-category growth phrasing used when a category ranks low. */
const GROWTH_PHRASES: Record<string, string> = {
  core_values: "reflecting on which values are non-negotiable versus flexible could deepen your clarity",
  communication: "practicing active listening and \"I feel\" statements could strengthen difficult conversations",
  lifestyle: "exploring how your daily rhythm would align with a partner's could surface useful conversation topics",
  money: "building a shared vocabulary around spending and saving would help future alignment conversations",
  career: "clarifying how ambition and downtime balance in your ideal relationship could be valuable",
  family: "considering how family expectations will shape your partnership is worth deeper reflection",
  children: "exploring your parenting preferences further would help you enter that conversation with a partner",
  conflict_resolution: "developing repair rituals after disagreements could reduce friction when tensions rise",
  health_wellness: "examining how your wellbeing habits translate into shared routines could strengthen partnership",
  personal_growth: "identifying one or two growth habits to practice with a partner would build momentum",
  social_life: "finding the right balance of shared and independent social time is worth intentional thought",
  long_term_vision: "getting specific about timelines and milestones would sharpen your picture of a shared future",
};

function scoreTier(score: number): ScoreTier {
  if (score >= 70) return "high";
  if (score >= 45) return "moderate";
  return "developing";
}

/** Deterministic sort: score desc, then label asc (stable tie-break). */
function sortCategories(categories: CategoryResult[]): CategoryResult[] {
  return [...categories].sort(
    (a, b) => b.score - a.score || a.label.localeCompare(b.label),
  );
}

export class MockProvider implements AIProvider {
  async generateInsights(results: BlueprintResults, relationshipType: RelationshipType = "romantic"): Promise<AIInsights> {
    return this.buildInsights(results, relationshipType);
  }

  private buildInsights(results: BlueprintResults, relationshipType: RelationshipType = "romantic"): AIInsights {
    const { sessionId, overallScore, categoryResults } = results;
    const sorted = sortCategories(categoryResults);
    const tier = scoreTier(overallScore);

    // ── Guard: no category data ──────────────────────────────
    if (sorted.length === 0) {
      return {
        sessionId,
        blueprintSummary: `Your Compatibility Blueprint™ assessment shows an overall score of ${overallScore}/100. Without category-level detail available, this summary is based on your overall result and your commitment to structured self-reflection.`,
        personalStrengths: [
          "Commitment to structured relationship reflection",
          "Honest self-assessment across relationship dimensions",
        ],
        growthOpportunities: [
          "Completing the full Blueprint assessment will unlock a detailed category-level analysis",
        ],
        reflectionQuestions: [
          "What prompted you to explore your relationship compatibility at this point in your life?",
          "What do you hope to learn about yourself through this process?",
        ],
        communicationRecommendations: [
          "Practice active listening by summarizing what a partner said before responding",
          "Use \"I feel\" statements when discussing sensitive topics",
        ],
        relationshipReadiness: {
          level: overallScore >= 70 ? "High" : overallScore >= 45 ? "Moderate" : "Developing",
          summary: `Based on an overall score of ${overallScore}/100, you are ${overallScore >= 70 ? "strongly" : overallScore >= 45 ? "moderately" : "developing"} positioned for a serious relationship.`,
          strengths: ["Willingness to engage in structured relationship reflection"],
          areas_to_develop: ["Completing the full Blueprint assessment for a detailed profile"],
        },
      };
    }

    const top = sorted[0];
    const second = sorted[1] ?? top;
    const bottom = sorted[sorted.length - 1];
    const secondBottom = sorted[sorted.length - 2] ?? bottom;
    const dealBreakers = categoryResults.filter((c) => c.dealBreakerTriggered);

    // ── blueprintSummary: 2–3 paragraphs ─────────────────────
    const paragraph1 =
      tier === "high"
        ? `Your Compatibility Blueprint™ assessment reflects an overall score of ${overallScore}/100, a strong result that suggests a well-developed sense of what you bring to a relationship. Your answers were consistent and self-aware across the relationship dimensions, which makes this profile a reliable foundation for exploring a deeper partnership.`
        : tier === "moderate"
          ? `Your overall compatibility score of ${overallScore}/100 shows a solid foundation with meaningful room to grow in specific areas. The Blueprint captures a realistic mix of established strengths and open questions, which is exactly the kind of profile that benefits from continued self-reflection.`
          : `Your overall compatibility score of ${overallScore}/100 suggests you are early in the process of mapping your relationship preferences. That is a valuable starting point: the Blueprint now gives you a concrete picture of where you stand, and the areas below offer a useful map for the work ahead.`;

    const paragraph2 = `Your strongest dimension is ${top.label} at ${top.score}/100, while ${bottom.label} at ${bottom.score}/100 offers the most room for exploration. This pattern points toward the kinds of experiences and conversations that would feel most natural for you, and the growth areas worth paying attention to as you get to know a partner.`;

    const paragraph3 =
      dealBreakers.length > 0
        ? `One or more of your responses triggered a deal-breaker flag (${dealBreakers.map((d) => d.label).join(", ")}). This is not a verdict, it is a signal to treat those topics as important conversations to have early and honestly with a partner.`
        : `No deal-breaker flags were triggered in your responses, and your scores are distributed broadly across relationship dimensions — a sign that you are engaging with the full picture rather than a narrow slice of it.`;

    const blueprintSummary = `${paragraph1}\n\n${paragraph2}\n\n${paragraph3}`;

    // ── personalStrengths: top 3–5 categories ────────────────
    const personalStrengths = sorted.slice(0, Math.min(5, sorted.length)).map((c) => {
      const phrase = STRENGTH_PHRASES[c.category] ?? "a consistent, self-aware area of your relationship profile";
      return `${c.label} (${c.score}/100) — ${phrase}`;
    });
    // Always keep at least 3 when data permits.
    if (personalStrengths.length < 3 && sorted.length > personalStrengths.length) {
      personalStrengths.push(
        `Honest self-assessment across ${sorted.length} relationship dimensions`,
        "Commitment to understanding your compatibility profile",
      );
    }

    // ── growthOpportunities: bottom 3 categories ─────────────
    const growthCount = Math.min(3, sorted.length);
    const growthOpportunities = sorted.slice(-growthCount).map((c) => {
      const phrase = GROWTH_PHRASES[c.category] ?? "an area with room for reflection";
      return `${c.label} (${c.score}/100) — ${phrase}`;
    });

    // ── reflectionQuestions: 5 data-driven questions ─────────
    const reflectionQuestions = [
      `What does your ${top.label} score of ${top.score}/100 reveal about what you naturally prioritize in a relationship?`,
      `How have your past experiences shaped the way you answered the ${bottom.label} questions?`,
      dealBreakers.length > 0
        ? `Your responses flagged a deal-breaker threshold in ${dealBreakers[0].label}. What would need to be true for you to revisit that boundary?`
        : `Your scores range from ${bottom.score}/100 to ${top.score}/100 across dimensions. What explains the widest gap for you?`,
      tier === "high"
        ? "How do you keep your strongest qualities from being taken for granted during stressful periods?"
        : tier === "moderate"
          ? `If you could move ${bottom.label} closer to your strongest area over the next year, which habits would change first?`
          : "What is one new experience or conversation that would help you learn more about your relationship preferences?",
      "If a partner read your results, which category would you most want to discuss together first, and why?",
    ];

    // ── communicationRecommendations: 3–4 tailored tips ──────
    const commCategory = categoryResults.find((c) => c.category === "communication");
    const commScore = commCategory?.score ?? overallScore;
    const conflictCategory = categoryResults.find((c) => c.category === "conflict_resolution");
    const conflictScore = conflictCategory?.score ?? 50;

    const communicationRecommendations =
      commScore < 45
        ? [
            "Practice active listening: summarize what a partner said before sharing your own view; it slows conversations down in a good way.",
            "Use \"I feel\" statements when a topic gets tense, so the discussion stays about your experience rather than blame.",
            "Schedule a short weekly check-in with a partner so small concerns surface before they become larger ones.",
            "Ask one clarifying question before assuming you understand, most miscommunication starts with a guess.",
          ]
        : commScore < 70
          ? [
              "You have solid communication habits — the next step is making them explicit, such as naming when you need a pause during a difficult conversation.",
              "Deepen conversations by asking open-ended questions about a partner's perspective rather than confirming your own.",
              "Pay attention to non-verbal cues: tone and body language often carry more than the words during sensitive topics.",
              "Create a shared repair ritual — a small gesture both of you recognize as a reset after disagreement.",
            ]
          : [
              "Your communication strengths are a real asset — use them deliberately when introducing harder topics, so they don't carry tension from the start.",
              "Keep refining by asking follow-up questions that go one layer deeper than the first answer.",
              "Be careful that strong communication doesn't become one-sided; leave clear space for a partner to set the pace.",
              "Notice when a conversation is about logistics versus feelings, and address both.",
            ];

    if (conflictScore < commScore - 15 && communicationRecommendations.length < 4) {
      communicationRecommendations.push(
        `Your conflict resolution score (${conflictScore}/100) trails your communication score (${commScore}/100), practicing repair after disagreements would close that gap.`,
      );
    }

    // ── relationshipReadiness ────────────────────────────────
    const readinessSummary =
      tier === "high"
        ? `You demonstrate high readiness for a serious relationship, with ${top.label} as your clearest strength at ${top.score}/100 and ${bottom.label} at ${bottom.score}/100 as the area to develop alongside a partner.`
        : tier === "moderate"
          ? `You show moderate readiness for a serious relationship, grounded in ${top.label} (${top.score}/100) with ${bottom.label} (${bottom.score}/100) as the area to develop alongside a partner.`
          : `You are developing your readiness for a serious relationship; your overall score of ${overallScore}/100 is a concrete starting point, with ${top.label} (${top.score}/100) as an early strength to build on.`;

    const areasToDevelop = [
      `${bottom.label} (${bottom.score}/100) — ${GROWTH_PHRASES[bottom.category] ?? "an area to explore"}`,
      dealBreakers.length > 0
        ? `Discussing the deal-breaker flagged in ${dealBreakers[0].label} early and honestly with a partner`
        : `Turning reflection into regular, low-stakes conversations with a partner (starting with ${secondBottom.label})`,
    ];

    return {
      sessionId,
      blueprintSummary,
      personalStrengths,
      growthOpportunities,
      reflectionQuestions,
      communicationRecommendations,
      relationshipReadiness: {
        level: overallScore >= 70 ? "High" : overallScore >= 45 ? "Moderate" : "Developing",
        summary: readinessSummary,
        strengths: [
          `${top.label} (${top.score}/100) — ${STRENGTH_PHRASES[top.category] ?? "a consistent strength"}`,
          `${second.label} (${second.score}/100) — a solid secondary foundation`,
        ],
        areas_to_develop: areasToDevelop,
      },
    };
  }
}
