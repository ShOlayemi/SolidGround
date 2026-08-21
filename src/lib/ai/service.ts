// ──────────────────────────────────────────────────────────────
// SolidGround AI — AI Service
// ──────────────────────────────────────────────────────────────
// Orchestrates AI insight generation through the provider
// abstraction (OpenAI or Mock), plus response validation, caching,
// and fallback handling.
// ──────────────────────────────────────────────────────────────

import OpenAI from "openai";
import type { BlueprintResults } from "@/lib/scoring/types";
import type { AIInsights, RelationshipType } from "@/types";
import { createClient } from "@/lib/supabase/server";
import { aiProvider } from "./providerFactory";

// ── OpenAI client (lazy init) ──────────────────────────────────
// Used by OpenAIProvider. Kept here so the provider abstraction
// can reuse the same client and env validation.

export function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set in environment.");
  }
  return new OpenAI({ apiKey });
}

// ── Fallback insights (returned on error) ──────────────────────
// Used by OpenAIProvider when the API call fails.

export function fallbackInsights(sessionId: string, results: BlueprintResults, relationshipType: RelationshipType = "romantic"): AIInsights {
  const friend = relationshipType === "platonic";
  const noun = friend ? "friendship" : "relationship";
  const person = friend ? "friend" : "partner";
  const topCategory = results.categoryResults.reduce((best, curr) =>
    curr.score > best.score ? curr : best,
    results.categoryResults[0],
  );

  const lowCategory = results.categoryResults.reduce((worst, curr) =>
    curr.score < worst.score ? curr : worst,
    results.categoryResults[0],
  );

  return {
    sessionId,
    blueprintSummary: `Your ${friend ? "Friendship Blueprint" : "Compatibility Blueprint™"} assessment shows an overall score of ${results.overallScore}/100. Your strongest dimension is ${topCategory.label} at ${topCategory.score}/100, which suggests this area is a core strength in how you approach ${noun}s. The area with the most room for growth is ${lowCategory.label} at ${lowCategory.score}/100.

Your results span 12 key ${noun} dimensions and reflect your unique perspectives on values, communication, lifestyle, and more. These insights are a starting point for self-reflection, not a judgment.

AI-powered insights are temporarily unavailable. The summary above is based on your raw assessment scores. Please try generating AI insights again later.`,
    personalStrengths: [
      `Strong performance in ${topCategory.label} (${topCategory.score}/100)`,
      "Self-awareness demonstrated through completing the full assessment",
      "Willingness to engage in structured relationship reflection",
      "Honest self-assessment across 12 relationship dimensions",
      "Commitment to understanding your relationship compatibility profile",
    ],
    growthOpportunities: [
      `${lowCategory.label} shows room for reflection and growth (${lowCategory.score}/100)`,
      "Consider exploring how your responses vary across different relationship contexts",
      `${person[0].toUpperCase() + person.slice(1)} comparison (Alignment Match™) can reveal blind spots you may not see alone`,
    ],
    reflectionQuestions: [
      `What surprised you most about your ${topCategory.label} results?`,
      `How do your ${lowCategory.label} responses reflect your past ${noun} experiences?`,
      `Which category do you think a ${person} would rate you differently on?`,
      "What's one pattern you noticed across all your responses?",
      "If you retook this in a year, which scores would you most want to see change?",
    ],
    communicationRecommendations: [
      `Use 'I feel' statements when discussing sensitive topics with a ${person}`,
      "Practice active listening by summarizing what your partner said before responding",
      "Schedule regular check-ins rather than waiting for issues to surface",
    ],
    relationshipReadiness: {
      level: results.overallScore >= 70 ? "High" : results.overallScore >= 45 ? "Moderate" : "Developing",
      summary: `Based on an overall score of ${results.overallScore}/100, you show ${results.overallScore >= 70 ? "strong" : results.overallScore >= 45 ? "moderate" : "developing"} readiness for a ${friend ? "strong friendship foundation" : "serious relationship"}.`,
      strengths: [
        `${topCategory.label} awareness (${topCategory.score}/100)`,
        "Completion of structured self-assessment",
      ],
      areas_to_develop: [
        `${lowCategory.label} exploration (${lowCategory.score}/100)`,
        "Continued self-reflection and growth",
      ],
    },
  };
}

// ── Response shape validation ──────────────────────────────────
// Used by OpenAIProvider to validate and normalize the raw
// JSON returned by the model.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validateAIResponse(data: any): AIInsights {
  // Required top-level fields
  const requiredStrings = [
    "blueprintSummary",
  ] as const;
  const requiredArrays = [
    "personalStrengths",
    "growthOpportunities",
    "reflectionQuestions",
    "communicationRecommendations",
  ] as const;

  for (const field of requiredStrings) {
    if (typeof data[field] !== "string") {
      throw new Error(`AI response missing or invalid field: ${field}`);
    }
  }
  for (const field of requiredArrays) {
    if (!Array.isArray(data[field])) {
      throw new Error(`AI response missing or invalid field: ${field}`);
    }
  }

  // Validate relationshipReadiness
  const rr = data.relationshipReadiness;
  if (!rr || typeof rr !== "object") {
    throw new Error("AI response missing relationshipReadiness");
  }
  if (typeof rr.level !== "string" || !["High", "Moderate", "Developing"].includes(rr.level)) {
    rr.level = "Moderate"; // safe fallback
  }
  if (typeof rr.summary !== "string") {
    rr.summary = "Readiness assessment based on your Compatibility Blueprint results.";
  }
  if (!Array.isArray(rr.strengths)) {
    rr.strengths = [];
  }
  if (!Array.isArray(rr.areas_to_develop)) {
    rr.areas_to_develop = [];
  }

  return {
    sessionId: "",
    blueprintSummary: data.blueprintSummary as string,
    personalStrengths: data.personalStrengths as string[],
    growthOpportunities: data.growthOpportunities as string[],
    reflectionQuestions: data.reflectionQuestions as string[],
    communicationRecommendations: data.communicationRecommendations as string[],
    relationshipReadiness: {
      level: rr.level as string,
      summary: rr.summary as string,
      strengths: rr.strengths as string[],
      areas_to_develop: rr.areas_to_develop as string[],
    },
  };
}

// ── Generate Insights ──────────────────────────────────────────

/**
 * Generate AI-powered insights from blueprint results using the
 * active provider (OpenAI by default, Mock in mock mode).
 *
 * NEVER throws — providers return a fallback on any error.
 */
export async function generateInsights(
  results: BlueprintResults, relationshipType: RelationshipType = "romantic",
): Promise<AIInsights> {
  return aiProvider.generateInsights(results, relationshipType);
}

// ── Get or Generate with Caching ───────────────────────────────

/**
 * Check the ai_insights table for cached insights.
 * If found, return immediately (no API call).
 * If not found, generate new insights, store, and return.
 *
 * This is the caching layer that prevents duplicate API costs.
 */
export async function getOrGenerateInsights(
  sessionId: string,
): Promise<{ success: boolean; insights?: AIInsights; error?: string; cached?: boolean }> {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: "Not authenticated." };
    }
    const userId = session.user.id;

    // ── CACHE CHECK ──────────────────────────────────────────
    const { data: cachedRow, error: cacheError } = await supabase
      .from("ai_insights")
      .select("id, session_id, blueprint_summary, personal_strengths, growth_opportunities, reflection_questions, communication_recommendations, relationship_readiness, generated_at")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (cacheError) {
      console.warn("AI insights cache query error:", cacheError.message);
    }

    // Skip cached fallback so MockProvider can regenerate proper insights
    const isCachedFallback = cachedRow?.blueprint_summary?.includes("temporarily unavailable");

    if (isCachedFallback) {
      // Delete stale fallback so the INSERT below doesn't conflict
      await supabase.from("ai_insights").delete().eq("session_id", sessionId);
    }

    if (cachedRow && !isCachedFallback) {
      return {
        success: true,
        cached: true,
        insights: {
          id: cachedRow.id,
          sessionId: cachedRow.session_id,
          blueprintSummary: cachedRow.blueprint_summary,
          personalStrengths: cachedRow.personal_strengths as string[],
          growthOpportunities: cachedRow.growth_opportunities as string[],
          reflectionQuestions: cachedRow.reflection_questions as string[],
          communicationRecommendations: cachedRow.communication_recommendations as string[],
          relationshipReadiness: cachedRow.relationship_readiness as AIInsights["relationshipReadiness"],
          generatedAt: cachedRow.generated_at,
        },
      };
    }

    // ── FETCH RESULTS ────────────────────────────────────────
    const { data: resultRow, error: resultError } = await supabase
      .from("blueprint_results")
      .select("session_id, user_id, category_results, overall_score, overall_confidence, created_at, updated_at")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .single();

    if (resultError || !resultRow) {
      return { success: false, error: "Blueprint results not found for this session." };
    }

    const results: BlueprintResults = {
      sessionId: resultRow.session_id,
      userId: resultRow.user_id,
      categoryResults: resultRow.category_results,
      overallScore: resultRow.overall_score,
      overallConfidence: resultRow.overall_confidence,
      completedAt: resultRow.updated_at ?? resultRow.created_at,
    };

    // ── GENERATE ─────────────────────────────────────────────
    const { data: sessionMode } = await supabase.from("assessment_sessions").select("mode").eq("id", sessionId).maybeSingle();
    const relationshipType = sessionMode?.mode ?? "romantic";
    const insights = await generateInsights(results, relationshipType);
    insights.sessionId = sessionId;

    // ── STORE ────────────────────────────────────────────────
    const { error: insertError } = await supabase.from("ai_insights").insert({
      user_id: userId,
      session_id: sessionId,
      blueprint_summary: insights.blueprintSummary,
      personal_strengths: insights.personalStrengths,
      growth_opportunities: insights.growthOpportunities,
      reflection_questions: insights.reflectionQuestions,
      communication_recommendations: insights.communicationRecommendations,
      relationship_readiness: insights.relationshipReadiness,
    });

    if (insertError) {
      console.error("Failed to store AI insights:", insertError);
      // Non-fatal: return insights even if storage fails
    }

    return { success: true, cached: false, insights };
  } catch (err) {
    console.error("getOrGenerateInsights error:", err);
    return { success: false, error: "Failed to generate AI insights." };
  }
}
