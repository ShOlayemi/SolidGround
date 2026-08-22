// ──────────────────────────────────────────────────────────────
// SolidGround AI — Prompt Engineering
// ──────────────────────────────────────────────────────────────
// Builds structured prompts for OpenAI that include actual
// assessment data. Never hallucinates. Never makes decisions.
// ──────────────────────────────────────────────────────────────

import type { BlueprintResults, CategoryResult } from "@/lib/scoring/types";
import { CATEGORY_LABELS } from "@/lib/assessment/questions";
import { getQuestionById } from "@/lib/assessment/questions";
import type { AssessmentCategory, RelationshipType } from "@/types";

interface QuestionScoreDisplay {
  questionId: string;
  questionText: string;
  score: number;
  categoryLabel: string;
}

function buildQuestionScoreList(
  categoryResults: CategoryResult[],
  filter: "strengths" | "growth",
  limit = 5,
): QuestionScoreDisplay[] {
  const items: QuestionScoreDisplay[] = [];

  for (const cr of categoryResults) {
    const ids = filter === "strengths" ? cr.strengths : cr.growthAreas;
    for (const qId of ids) {
      const question = getQuestionById(qId);
      const score = cr.questionScores[qId] ?? 0;
      items.push({
        questionId: qId,
        questionText: question?.text ?? `Question ${qId}`,
        score,
        categoryLabel: cr.label,
      });
    }
  }

  items.sort((a, b) =>
    filter === "strengths" ? b.score - a.score : a.score - b.score,
  );
  return items.slice(0, limit);
}

/**
 * Build a structured prompt for the OpenAI API.
 *
 * The prompt includes concrete assessment data and instructs the
 * model to return JSON. It explicitly forbids:
 * - Making relationship decisions (break up, get married, etc.)
 * - Hallucinating data not present in the input
 * - Giving prescriptive advice
 */
export function buildInsightsPrompt(results: BlueprintResults, relationshipType: RelationshipType = "romantic"): string {
  const { overallScore, categoryResults } = results;

  const modeInstruction = relationshipType === "platonic"
    ? "You are analyzing a friendship profile, not a romantic relationship. Use friend/friendship/connection language throughout. Do not mention partners, dating, marriage, or couples."
    : "You are analyzing a romantic relationship compatibility profile."

  // ── Build category score list ──────────────────────────────
  const categoryLines = categoryResults
    .map(
      (cr) =>
        `- ${cr.label}: ${cr.score}/100 (consistency: ${cr.confidence}%)` +
        (cr.dealBreakerTriggered ? " ⚠️ DEAL-BREAKER TRIGGERED" : ""),
    )
    .join("\n");

  // ── Top strengths (with question text) ─────────────────────
  const topStrengths = buildQuestionScoreList(categoryResults, "strengths", 5);
  const strengthsLines = topStrengths
    .map((s) => `- [${s.categoryLabel}] Score ${s.score}/100: "${s.questionText}"`)
    .join("\n");

  // ── Top growth areas (with question text) ──────────────────
  const topGrowth = buildQuestionScoreList(categoryResults, "growth", 5);
  const growthLines = topGrowth
    .map((g) => `- [${g.categoryLabel}] Score ${g.score}/100: "${g.questionText}"`)
    .join("\n");

  // ── Deal-breaker flags ─────────────────────────────────────
  const dealBreakers = categoryResults
    .filter((cr) => cr.dealBreakerTriggered)
    .map((cr) => {
      // Find which question triggered it
      const triggeredIds = cr.strengths.filter(
        (qId) => (cr.questionScores[qId] ?? 0) >= 85,
      );
      const triggeredTexts =
        triggeredIds.length > 0
          ? triggeredIds
              .map((qId) => getQuestionById(qId)?.text ?? qId)
              .join("; ")
          : "a deal-breaker threshold was met";
      return `- ${cr.label}: ${triggeredTexts}`;
    });

  const dealBreakerSection =
    dealBreakers.length > 0
      ? `\n\nDeal-Breaker Flags:\n${dealBreakers.join("\n")}`
      : "";

  // ── All category data for reference ────────────────────────
  const allCategoryData = categoryResults
    .map((cr) => {
      const label = CATEGORY_LABELS[cr.category as AssessmentCategory] ?? cr.category;
      const topQ = buildQuestionScoreList([cr], "strengths", 2);
      const bottomQ = buildQuestionScoreList([cr], "growth", 2);
      return (
        `${label} (${cr.score}/100):\n` +
        `  Strengths: ${topQ.map((q) => `"${q.questionText}" (${q.score})`).join("; ") || "none"}\n` +
        `  Growth: ${bottomQ.map((q) => `"${q.questionText}" (${q.score})`).join("; ") || "none"}`
      );
    })
    .join("\n\n");

  // ── Assemble the prompt ────────────────────────────────────
  return `You are an AI relationship insight analyst for SolidGround AI, a Relationship Intelligence Platform.

${modeInstruction} Your role is to help users understand themselves better based on their Compatibility Blueprint™ assessment data. You are NOT a relationship coach or therapist. You do NOT make relationship decisions, give prescriptive advice, or tell users what to do.

## CRITICAL RULES
1. ONLY reference data explicitly provided below. NEVER invent or assume data.
2. NEVER tell the user to "break up," "get married," "leave," or "stay." You do NOT make decisions.
3. NEVER say "you should" or "you must." Use "you might consider," "you could reflect on," or "users with similar patterns often find..."
4. If the data shows high scores, celebrate strengths without prescribing outcomes.
5. If the data shows low scores, frame them as growth opportunities, not failures.
6. ALL insights must directly reference specific scores or question responses from the data below.

## USER'S ASSESSMENT DATA

Overall Compatibility Score: ${overallScore}/100

Category Scores:
${categoryLines}

Top 5 Strengths (highest scoring responses):
${strengthsLines || "No strong strengths identified."}

Top 5 Growth Areas (lowest scoring responses):
${growthLines || "No significant growth areas identified."}${dealBreakerSection}

## COMPLETE CATEGORY BREAKDOWN

${allCategoryData}

## INSTRUCTIONS
Analyze the data above and return a JSON object with the following shape. Every field must be populated with thoughtful, data-grounded content:

{
  "blueprintSummary": "2-3 paragraph narrative summary that references specific scores (e.g., 'Your overall score of ${overallScore}/100 reflects...'). Mention the highest and lowest scoring categories by name and score. Note any deal-breaker flags if present. The tone should be insightful, warm, and rooted in the data.",
  "personalStrengths": ["5 strengths based on the actual high-scoring areas above. Each should reference specific categories or responses."],
  "growthOpportunities": ["3 growth areas based on the actual low-scoring areas above. Frame positively as opportunities for self-reflection."],
  "reflectionQuestions": ["5 thought-provoking questions that help the user reflect on their specific results. Each should reference a specific category or pattern visible in their data."],
  "communicationRecommendations": ["3 communication tips that relate to the user's specific communication score and patterns in their data."],
  "relationshipReadiness": {
    "level": "High|Moderate|Developing",
    "summary": "1-2 sentence summary based on the score bands: 70–100 Strong readiness, 45–69 Developing readiness, 0–44 Needs Attention.",
    "strengths": ["2 readiness strengths drawn from the data"],
    "areas_to_develop": ["2 areas to consider developing, drawn from the data"]
  }
}

Return ONLY the JSON object, no other text.`;
}
