// ──────────────────────────────────────────────────────────────
// SolidGround AI — Blueprint AI Insights API (ADD for mobile client)
// ──────────────────────────────────────────────────────────────
// MOBILE-CLIENT ADD (owner-approved): serves the web backend's AI-generated
// Blueprint insights to the mobile app over a bearer-token + CORS endpoint.
// NEW route only — no existing web-app behavior, file, migration, or RLS
// policy is touched; the web app's live behavior is unchanged.
//
// The web app itself only ever served AI insights via server-side COOKIE auth
// (dashboard pages + the /api/reports/relationship PDF route). This route is
// the missing bearer-token + CORS surface the mobile client needs.
//
//   GET /api/blueprint/insights
//   Authorization: Bearer <supabase access token>
//
//   Response 200:
//     {
//       "success": true,
//       "cached": boolean,               // true when served from ai_insights cache
//       "insights": {
//         "sessionId": string,
//         "blueprintSummary": string,
//         "personalStrengths": string[],
//         "growthOpportunities": string[],
//         "reflectionQuestions": string[],
//         "communicationRecommendations": string[],
//         "relationshipReadiness": { level, summary, strengths, areas_to_develop },
//         "generatedAt": string | undefined
//       }
//     }
//   Errors:
//     401 → token rejected ("Authentication required")
//     404 → user has no completed assessment ("Complete your assessment first")
//            OR the session's results row is missing
//     500 → server config / cache-query / generation failure
//   OPTIONS → 204 with CORS headers (preflight).
//
// DESIGN:
//   • BEARER AUTH — authenticateRequest() builds a token-bound Supabase client
//     (anon key + the caller's access token) and verifies the token via
//     supabase.auth.getUser(token). Every subsequent query runs under RLS with
//     that user's identity — ownership is enforced at the database level,
//     never trusted from a client-supplied id.
//   • GET-OR-GENERATE — reuses the existing getOrGenerateInsights() caching
//     layer, passing the token-bound client + verified userId. Cache hit →
//     immediate return (no OpenAI call); miss → generate via the active
//     provider (live gpt-4o-mini, or Mock fallback), store, and return.
//   • KEY HANDLING — OpenAI + service-role keys stay server-side; only the
//     caller's bearer token is used. `runtime = "nodejs"` so the OpenAI client
//     and PostgREST run in the Node runtime.
// ──────────────────────────────────────────────────────────────
import {
  authenticateRequest,
  json,
  optionsResponse,
} from "@/lib/pairings/mobile-api";
import { getOrGenerateInsights } from "@/lib/ai/service";

export const runtime = "nodejs";

/** CORS preflight (shared helper — mirrors the coach + pairing routes). */
export async function OPTIONS() {
  return optionsResponse();
}

/**
 * GET /api/blueprint/insights — the user's latest completed assessment's AI
 * insights (get-or-generate from the ai_insights cache).
 */
export async function GET(request: Request) {
  // 1. Bearer-token authentication (shared helper — 401 style matches the
  //    pairing + coach routes). Returns the token-bound client + verified userId.
  const auth = await authenticateRequest(request);
  if (!auth.ok) return auth.response;
  const { supabase, userId } = auth;

  // 2. The user's latest completed session (mirrors /api/blueprint/results).
  const { data: session, error: sessionError } = await supabase
    .from("assessment_sessions")
    .select("id, user_id, status")
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (sessionError) {
    console.error("[api/blueprint/insights] Session query error:", sessionError.message);
    return json({ error: "Failed to load insights." }, 500);
  }
  if (!session) {
    return json({ error: "Complete your assessment first" }, 404);
  }
  const sessionId: string = session.id;

  // 3. Get-or-generate the AI insights with the token-bound client + verified
  //    userId. Cache hit returns immediately; otherwise the active provider
  //    generates and stores them.
  const outcome = await getOrGenerateInsights(sessionId, supabase, userId);
  if (!outcome.success || !outcome.insights) {
    // "Blueprint results not found" → 404; anything else → 500.
    if (outcome.error === "Blueprint results not found for this session.") {
      return json({ error: "Complete your assessment first" }, 404);
    }
    console.error("[api/blueprint/insights] Get-or-generate failed:", outcome.error);
    return json({ error: "Failed to generate AI insights." }, 500);
  }

  const ins = outcome.insights;
  // 4. Return the AI insights in the mobile-friendly shape.
  return json(
    {
      success: true,
      cached: outcome.cached ?? false,
      insights: {
        sessionId: ins.sessionId,
        blueprintSummary: ins.blueprintSummary,
        personalStrengths: ins.personalStrengths,
        growthOpportunities: ins.growthOpportunities,
        reflectionQuestions: ins.reflectionQuestions,
        communicationRecommendations: ins.communicationRecommendations,
        relationshipReadiness: ins.relationshipReadiness,
        generatedAt: ins.generatedAt,
      },
    },
    200
  );
}
