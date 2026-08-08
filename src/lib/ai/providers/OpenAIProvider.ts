// ──────────────────────────────────────────────────────────────
// SolidGround AI — OpenAI AI Provider
// ──────────────────────────────────────────────────────────────
// The production AI provider. Calls the OpenAI Chat Completions
// API with the structured Blueprint prompt and returns validated
// AIInsights. All original behavior is preserved:
//   - model: gpt-4o-mini
//   - temperature: 0.3
//   - response_format: json_object
//   - graceful fallback on any error or empty response
// NEVER throws — returns fallback content on any failure.
// ──────────────────────────────────────────────────────────────

import type { BlueprintResults } from "@/lib/scoring/types";
import type { AIInsights, RelationshipType } from "@/types";
import { buildInsightsPrompt } from "../prompts";
import { getOpenAI, fallbackInsights, validateAIResponse } from "../service";
import type { AIProvider } from "./types";

export class OpenAIProvider implements AIProvider {
  /**
   * Call OpenAI to generate AI-powered insights from blueprint results.
   *
   * NEVER throws — returns a fallback on any error.
   */
  async generateInsights(results: BlueprintResults, relationshipType: RelationshipType = "romantic"): Promise<AIInsights> {
    try {
      const openai = getOpenAI();
      const prompt = buildInsightsPrompt(results, relationshipType);

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You return only valid JSON that exactly matches the requested schema. You are an AI analyst, not a therapist or decision-maker.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const rawContent = response.choices[0]?.message?.content;
      if (!rawContent) {
        console.warn("OpenAI returned empty content.");
        return fallbackInsights(results.sessionId, results);
      }

      const parsed = JSON.parse(rawContent);
      const validated = validateAIResponse(parsed);
      validated.sessionId = results.sessionId;

      return validated;
    } catch (err) {
      console.error("OpenAI generation error:", err);
      return fallbackInsights(results.sessionId, results);
    }
  }
}
