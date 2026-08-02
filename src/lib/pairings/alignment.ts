// ──────────────────────────────────────────────────────────────
// SolidGround AI — Pairwise Alignment Computation
// ──────────────────────────────────────────────────────────────
// Computes alignment between two Compatibility Blueprints.
// Pure data transformation — no database calls, no side effects.
// ──────────────────────────────────────────────────────────────

import type { BlueprintResults, CategoryResult } from "@/lib/scoring/types";
import type {
  AlignmentResults,
  CategoryAlignment,
  ConflictItem,
  ConversationGuide,
  GrowthOpportunity,
  DealBreakerIntersection,
  ComparisonReport,
} from "@/types";
import { CATEGORY_ORDER, CATEGORY_LABELS } from "@/lib/assessment/questions";
import type { AssessmentCategory } from "@/types";
import { DEFAULT_WEIGHTS } from "@/lib/scoring/weights";

// ── Helpers ───────────────────────────────────────────────────

/** Build a lookup map from category -> CategoryResult. */
function buildCategoryMap(
  results: BlueprintResults,
): Map<string, CategoryResult> {
  const map = new Map<string, CategoryResult>();
  for (const cr of results.categoryResults) {
    map.set(cr.category, cr);
  }
  return map;
}

// ── Conflict Type Classification ──────────────────────────────

/** Map category IDs to their conflict type classification. */
const CONFLICT_TYPE_MAP: Record<string, ConflictItem["type"]> = {
  core_values: "value_clash",
  conflict_resolution: "value_clash",
  lifestyle: "lifestyle_gap",
  social_life: "lifestyle_gap",
  health_wellness: "lifestyle_gap",
  communication: "communication_mismatch",
  long_term_vision: "vision_difference",
  career: "vision_difference",
  money: "vision_difference",
  family: "vision_difference",
  children: "vision_difference",
  personal_growth: "vision_difference",
};

function classifyConflictType(categoryId: string): ConflictItem["type"] {
  return CONFLICT_TYPE_MAP[categoryId] ?? "vision_difference";
}

function classifySeverity(diff: number): ConflictItem["severity"] {
  if (diff >= 50) return "high";
  if (diff >= 30) return "medium";
  return "low";
}

// ── Prompt Bank for Conversation Guides ───────────────────────

type PromptBank = Record<string, string[]>;

const CONVERSATION_PROMPTS: PromptBank = {
  // Core Values
  "core_values|value_clash": [
    "What does a successful partnership look like to you?",
    "Which values from your upbringing do you want to carry forward, and which would you leave behind?",
    "When have your core values been tested in a relationship before?",
    "How do you know when a value is non-negotiable versus something you can compromise on?",
    "What value do you most want your partner to share with you?",
  ],
  // Communication
  "communication|communication_mismatch": [
    "When you disagree, what helps you feel heard?",
    "How do you prefer to receive difficult feedback?",
    "What does a healthy conflict resolution process look like to you?",
    "How did your family handle disagreements when you were growing up?",
    "What's one communication pattern you'd like to improve in your relationships?",
  ],
  // Lifestyle
  "lifestyle|lifestyle_gap": [
    "What does a typical ideal weekend look like for you?",
    "How important is routine versus spontaneity in your daily life?",
    "How do you balance time together versus time apart in a relationship?",
    "What role does physical activity or wellness play in your life?",
    "How do you recharge after a stressful day?",
  ],
  // Money
  "money|vision_difference": [
    "How was money discussed in your family growing up?",
    "What does financial security mean to you?",
    "How do you approach saving versus spending on experiences?",
    "What are your long-term financial goals, and how do you plan to reach them?",
    "How would you handle a major unexpected expense?",
  ],
  // Career
  "career|vision_difference": [
    "How do you define career success?",
    "How do you balance career ambition with personal life?",
    "Would you relocate for a career opportunity? Under what circumstances?",
    "How important is it that your partner supports your career goals?",
    "What role does work play in your sense of identity and purpose?",
  ],
  // Family
  "family|vision_difference": [
    "How do you define 'family'?",
    "How close do you want to be with extended family?",
    "What family traditions matter most to you?",
    "How do you handle family obligations versus your own needs?",
    "What boundaries with family feel healthy to you?",
  ],
  // Children
  "children|vision_difference": [
    "What does your ideal family picture look like in 10 years?",
    "How were you raised, and how does that shape your views on parenting?",
    "What are your thoughts on parenting styles and discipline?",
    "How would you balance parenting responsibilities with your partner?",
    "What concerns or hopes do you have about becoming a parent?",
  ],
  // Conflict Resolution
  "conflict_resolution|value_clash": [
    "When conflict arises, what's your first instinct — address it or take space?",
    "What helps you feel safe and respected during a disagreement?",
    "How do you rebuild connection after a difficult conversation?",
    "What's one thing a past partner did during conflict that worked well for you?",
    "How do you handle it when you and your partner can't reach agreement?",
  ],
  // Health & Wellness
  "health_wellness|lifestyle_gap": [
    "What role does physical health play in your daily life?",
    "How do you approach mental and emotional well-being?",
    "How do you handle stress, and what support do you need from a partner?",
    "What does a healthy lifestyle look like to you, practically speaking?",
    "How do you feel about sharing health goals or habits with a partner?",
  ],
  // Personal Growth
  "personal_growth|vision_difference": [
    "What personal goals are you currently working toward?",
    "How important is it that you and your partner grow together?",
    "How do you stay motivated when working on yourself?",
    "What's an area where you'd like your partner's support in growing?",
    "What does it mean to you for two people to 'grow together' in a relationship?",
  ],
  // Social Life
  "social_life|lifestyle_gap": [
    "How do you balance friendships and a romantic relationship?",
    "What does your ideal social life look like?",
    "How important is it that you and your partner share a friend group?",
    "How do you feel about solo social time versus socializing as a couple?",
    "What role does community or belonging play in your life?",
  ],
  // Long-Term Vision
  "long_term_vision|vision_difference": [
    "Where do you see yourself in 10 years?",
    "What does 'home' mean to you?",
    "How do you think about aging and long-term planning?",
    "What dreams or aspirations do you most want to pursue?",
    "What does a meaningful life look like to you?",
  ],
};

// ── Fallback prompts for any category+type combo not in the bank ──

const FALLBACK_PROMPTS: string[] = [
  "What matters most to you in this area of your life?",
  "How has your perspective on this topic evolved over time?",
  "What would your ideal partnership look like in this area?",
  "How can your partner best support you in this aspect of your relationship?",
];

// ── Category-level shared strengths (above question-level) ────

/**
 * Identify categories where both partners score ≥ 75 as shared strengths.
 * This is distinct from the per-question shared strengths in computeAlignment.
 */
function findSharedStrengths(
  inviterMap: Map<string, CategoryResult>,
  inviteeMap: Map<string, CategoryResult>,
): { categoryId: string; categoryName: string; questionIds: string[] }[] {
  const strengths: { categoryId: string; categoryName: string; questionIds: string[] }[] = [];

  for (const catId of CATEGORY_ORDER) {
    const inviterCat = inviterMap.get(catId);
    const inviteeCat = inviteeMap.get(catId);

    const inviterScore = inviterCat?.score ?? 0;
    const inviteeScore = inviteeCat?.score ?? 0;

    if (inviterScore >= 75 && inviteeScore >= 75) {
      // Collect question IDs where both scored ≥ 75
      const inviterQS = inviterCat?.questionScores ?? {};
      const inviteeQS = inviteeCat?.questionScores ?? {};
      const allQIds = new Set([...Object.keys(inviterQS), ...Object.keys(inviteeQS)]);

      const sharedQIds: string[] = [];
      for (const qId of allQIds) {
        if ((inviterQS[qId] ?? 0) >= 75 && (inviteeQS[qId] ?? 0) >= 75) {
          sharedQIds.push(qId);
        }
      }

      strengths.push({
        categoryId: catId,
        categoryName: CATEGORY_LABELS[catId as AssessmentCategory] ?? catId,
        questionIds: sharedQIds,
      });
    }
  }

  return strengths;
}

// ── computeAlignment (existing, unchanged signature) ──────────

/**
 * Compute pairwise alignment between two users' BlueprintResults.
 *
 * For each of the 12 categories:
 * - alignment = 100 - |inviterScore - inviteeScore|  (0–100)
 * - shared strengths = question IDs where BOTH scores ≥ 75
 * - divergent areas = question IDs where one score ≥ 75 AND the other ≤ 35
 *
 * Overall alignment = weighted average of category alignments using DEFAULT_WEIGHTS.
 */
export function computeAlignment(
  inviterResults: BlueprintResults,
  inviteeResults: BlueprintResults,
): AlignmentResults {
  const inviterMap = buildCategoryMap(inviterResults);
  const inviteeMap = buildCategoryMap(inviteeResults);

  const categoryAlignments: CategoryAlignment[] = [];

  for (const catId of CATEGORY_ORDER) {
    const inviterCat = inviterMap.get(catId);
    const inviteeCat = inviteeMap.get(catId);

    const inviterScore = inviterCat?.score ?? 0;
    const inviteeScore = inviteeCat?.score ?? 0;
    const alignment = Math.max(0, 100 - Math.abs(inviterScore - inviteeScore));

    // Shared strengths: both ≥ 75 on the same question
    const sharedStrengths: string[] = [];
    // Divergent: one ≥ 75, the other ≤ 35
    const divergentAreas: string[] = [];

    const inviterQS = inviterCat?.questionScores ?? {};
    const inviteeQS = inviteeCat?.questionScores ?? {};

    // Collect all question IDs from both maps
    const allQuestionIds = new Set([
      ...Object.keys(inviterQS),
      ...Object.keys(inviteeQS),
    ]);

    for (const qId of allQuestionIds) {
      const s1 = inviterQS[qId] ?? 0;
      const s2 = inviteeQS[qId] ?? 0;

      if (s1 >= 75 && s2 >= 75) {
        sharedStrengths.push(qId);
      } else if (
        (s1 >= 75 && s2 <= 35) ||
        (s2 >= 75 && s1 <= 35)
      ) {
        divergentAreas.push(qId);
      }
    }

    categoryAlignments.push({
      categoryId: catId,
      categoryName: CATEGORY_LABELS[catId as AssessmentCategory] ?? catId,
      inviterScore,
      inviteeScore,
      alignment,
      sharedStrengths,
      divergentAreas,
    });
  }

  // Weighted overall alignment
  let totalWeight = 0;
  let weightedSum = 0;

  for (const ca of categoryAlignments) {
    const weight = DEFAULT_WEIGHTS[ca.categoryId] ?? 1.0;
    weightedSum += ca.alignment * weight;
    totalWeight += weight;
  }

  const overallAlignment =
    totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

  return {
    overallAlignment,
    categoryAlignments,
    createdAt: new Date().toISOString(),
  };
}

// ── Enhanced Analyzers (pure functions) ───────────────────────

/**
 * Analyze conflicts between partners at the category level.
 * For each category where |inviterScore - inviteeScore| ≥ 25:
 * - Classify severity and type
 * - Generate a human-readable description
 */
export function analyzeConflicts(
  categoryAlignments: CategoryAlignment[],
  _inviterResults: BlueprintResults,
  _inviteeResults: BlueprintResults,
): ConflictItem[] {
  const conflicts: ConflictItem[] = [];

  for (const ca of categoryAlignments) {
    const diff = Math.abs(ca.inviterScore - ca.inviteeScore);
    if (diff < 25) continue;

    const severity = classifySeverity(diff);
    const type = classifyConflictType(ca.categoryId);

    const description =
      `You have different approaches to ${ca.categoryName.toLowerCase()} — ` +
      `one partner scores ${ca.inviterScore} while the other scores ${ca.inviteeScore}.`;

    conflicts.push({
      categoryId: ca.categoryId,
      categoryName: ca.categoryName,
      severity,
      type,
      description,
      inviterStance: `Scores ${ca.inviterScore}/100 in ${ca.categoryName}`,
      inviteeStance: `Scores ${ca.inviteeScore}/100 in ${ca.categoryName}`,
    });
  }

  return conflicts;
}

/**
 * Generate conversation guides for each conflict.
 * Uses a rule-based prompt bank keyed by category + conflict type.
 */
export function generateConversationGuides(
  conflicts: ConflictItem[],
): ConversationGuide[] {
  const guides: ConversationGuide[] = [];

  for (const conflict of conflicts) {
    const key = `${conflict.categoryId}|${conflict.type}`;
    const prompts = CONVERSATION_PROMPTS[key] ?? FALLBACK_PROMPTS;

    guides.push({
      categoryId: conflict.categoryId,
      categoryName: conflict.categoryName,
      topic: `Discussing your differences in ${conflict.categoryName}`,
      prompts,
    });
  }

  return guides;
}

/**
 * Identify growth opportunities between partners:
 * - "shared": both score ≤ 40 → both can grow together
 * - "complementary": one ≥ 70, other ≤ 40 → teaching/learning dynamic
 */
export function findGrowthOpportunities(
  inviterResults: BlueprintResults,
  inviteeResults: BlueprintResults,
): GrowthOpportunity[] {
  const inviterMap = buildCategoryMap(inviterResults);
  const inviteeMap = buildCategoryMap(inviteeResults);
  const opportunities: GrowthOpportunity[] = [];

  for (const catId of CATEGORY_ORDER) {
    const inviterCat = inviterMap.get(catId);
    const inviteeCat = inviteeMap.get(catId);
    const inviterScore = inviterCat?.score ?? 0;
    const inviteeScore = inviteeCat?.score ?? 0;
    const categoryName = CATEGORY_LABELS[catId as AssessmentCategory] ?? catId;

    // "shared" growth: both low
    if (inviterScore <= 40 && inviteeScore <= 40) {
      opportunities.push({
        categoryId: catId,
        categoryName,
        type: "shared",
        description:
          `You both have room to grow in ${categoryName.toLowerCase()}. ` +
          `Working on this together can strengthen your relationship.`,
        inviterScore,
        inviteeScore,
      });
    }
    // "complementary": one high, one low
    else if (inviterScore >= 70 && inviteeScore <= 40) {
      opportunities.push({
        categoryId: catId,
        categoryName,
        type: "complementary",
        description:
          `You have complementary strengths in ${categoryName.toLowerCase()}. ` +
          `One partner can support the other's growth in this area.`,
        inviterScore,
        inviteeScore,
      });
    } else if (inviteeScore >= 70 && inviterScore <= 40) {
      opportunities.push({
        categoryId: catId,
        categoryName,
        type: "complementary",
        description:
          `You have complementary strengths in ${categoryName.toLowerCase()}. ` +
          `One partner can support the other's growth in this area.`,
        inviterScore,
        inviteeScore,
      });
    }
  }

  return opportunities;
}

/**
 * Find deal-breaker intersections across both partners.
 * For each category, checks if either or both partners triggered deal-breakers.
 */
export function findDealBreakerIntersections(
  inviterResults: BlueprintResults,
  inviteeResults: BlueprintResults,
): DealBreakerIntersection[] {
  const inviterMap = buildCategoryMap(inviterResults);
  const inviteeMap = buildCategoryMap(inviteeResults);
  const intersections: DealBreakerIntersection[] = [];

  for (const catId of CATEGORY_ORDER) {
    const inviterCat = inviterMap.get(catId);
    const inviteeCat = inviteeMap.get(catId);
    const categoryName = CATEGORY_LABELS[catId as AssessmentCategory] ?? catId;

    const inviterTriggered = inviterCat?.dealBreakerTriggered ?? false;
    const inviteeTriggered = inviteeCat?.dealBreakerTriggered ?? false;
    const bothTriggered = inviterTriggered && inviteeTriggered;

    intersections.push({
      categoryId: catId,
      categoryName,
      inviterTriggered,
      inviteeTriggered,
      bothTriggered,
    });
  }

  return intersections;
}

/**
 * Orchestrator: generate a full ComparisonReport by combining all analyzers.
 * Pure function — no DB calls, no AI, no side effects.
 */
export function generateComparisonReport(
  pairingId: string,
  inviterResults: BlueprintResults,
  inviteeResults: BlueprintResults,
): ComparisonReport {
  const alignment = computeAlignment(inviterResults, inviteeResults);
  const inviterMap = buildCategoryMap(inviterResults);
  const inviteeMap = buildCategoryMap(inviteeResults);

  const sharedStrengths = findSharedStrengths(inviterMap, inviteeMap);
  const potentialConflicts = analyzeConflicts(
    alignment.categoryAlignments,
    inviterResults,
    inviteeResults,
  );
  const conversationGuides = generateConversationGuides(potentialConflicts);
  const growthOpportunities = findGrowthOpportunities(inviterResults, inviteeResults);
  const dealBreakerIntersections = findDealBreakerIntersections(inviterResults, inviteeResults);

  return {
    pairingId,
    overallCompatibility: alignment.overallAlignment,
    categoryComparisons: alignment.categoryAlignments,
    sharedStrengths,
    potentialConflicts,
    conversationGuides,
    growthOpportunities,
    dealBreakerIntersections,
  };
}
