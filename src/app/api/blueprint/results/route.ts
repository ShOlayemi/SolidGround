// ──────────────────────────────────────────────────────────────
// SolidGround AI — Mobile Blueprint Results API (ADD for mobile client)
// ──────────────────────────────────────────────────────────────
// MOBILE-CLIENT ADD (owner-approved Option A, Sprint 3 close-out):
// A bearer-token JSON endpoint for the React Native app to fetch a
// user's Compatibility Blueprint™ results. It is a NEW route only —
// no existing web-app behavior, file, migration, or RLS policy is
// touched.
//
// Reuses the EXISTING web backend pieces:
//   - scoring engine:  computeBlueprintResults() (src/lib/scoring/compute.ts)
//   - question bank:   QUESTIONS (imported inside compute.ts)
//   - default weights: DEFAULT_WEIGHTS (src/lib/scoring/weights.ts)
//   - types:           BlueprintResults (src/lib/scoring/types.ts)
//   - results row:     blueprint_results upsert shape mirrored from
//                      computeResults() (src/lib/scoring/actions.ts)
//   - auth:            the mobile client's Supabase ACCESS TOKEN is
//                      validated via supabase.auth.getUser(token) and
//                      attached to the token-bound client so PostgREST
//                      RLS applies exactly as for the web app's own
//                      cookie-authenticated requests.
//
// Flow: authenticate → latest completed session → fetch the session's
// answers → recompute on EVERY request with the existing engine →
// upsert the results row (onConflict "session_id") and return the JSON.
// Freshness semantics: results are recomputed on every request —
// deterministic pure math over ≤88 answers, negligible cost — so the
// displayed results always match the user's latest saved answers (e.g.
// after the mobile "edit answers" flow re-saves answers for a completed
// session, the next GET returns the updated results, never a stale row).
// No side effects beyond the results upsert (no emails, notifications,
// or audit rows).
//
// CORS headers are included so the mobile WEB build (browser) can call
// this route; native apps simply ignore them.
// ──────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AssessmentAnswer } from "@/types";
import type { BlueprintResults } from "@/lib/scoring/types";
import { computeBlueprintResults } from "@/lib/scoring/compute";
import { DEFAULT_WEIGHTS } from "@/lib/scoring/weights";

export const runtime = "nodejs";

/** CORS headers for browser (mobile web build) callers. */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
} as const;

/** JSON response with CORS headers on every response. */
function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: CORS_HEADERS });
}

/** CORS preflight. */
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * GET /api/blueprint/results
 * Authorization: Bearer <supabase access token>
 *
 * Returns the user's latest Compatibility Blueprint™ results as JSON
 * in the BlueprintResults shape (see src/lib/scoring/types.ts).
 */
export async function GET(request: Request) {
  // 1. Bearer token from the Authorization header.
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : null;
  if (!token) {
    return json({ error: "Authentication required" }, 401);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[api/blueprint/results] Missing Supabase env configuration");
    return json({ error: "Server configuration error." }, 500);
  }

  // Token-bound client: the access token is sent on every request
  // (auth + PostgREST), so RLS applies exactly as for the web app's
  // cookie-authenticated sessions.
  const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  // 2. Validate the token against Supabase Auth.
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) {
    return json({ error: "Authentication required" }, 401);
  }
  const userId = authData.user.id;

  // 3. The user's latest completed session.
  const { data: session, error: sessionError } = await supabase
    .from("assessment_sessions")
    .select("id, user_id, status")
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sessionError) {
    console.error("[api/blueprint/results] Session query error:", sessionError.message);
    return json({ error: "Failed to load results." }, 500);
  }
  if (!session) {
    return json({ error: "Complete your assessment first" }, 404);
  }
  const sessionId: string = session.id;

  // 4. Fetch the session's answers and recompute on every request so
  //    the returned results always match the latest saved answers
  //    (mirrors computeResults()). computeBlueprintResults handles
  //    missing answers (neutral 50 per category), so a completed
  //    session with zero answers still yields valid results.
  const { data: answers, error: answersError } = await supabase
    .from("assessment_answers")
    .select("id, session_id, question_id, category, answer, created_at, updated_at")
    .eq("session_id", sessionId);

  if (answersError) {
    console.error("[api/blueprint/results] Answers query error:", answersError.message);
    return json({ error: "Failed to load results." }, 500);
  }

  const results = computeBlueprintResults(
    answers as AssessmentAnswer[],
    DEFAULT_WEIGHTS,
    userId,
    sessionId,
  );

  // Upsert the results row (one row per session_id via UNIQUE).
  const { error: upsertError } = await supabase
    .from("blueprint_results")
    .upsert(
      {
        session_id: sessionId,
        user_id: userId,
        category_results: results.categoryResults,
        overall_score: results.overallScore,
        overall_confidence: results.overallConfidence,
        weight_config: DEFAULT_WEIGHTS,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id" },
    );

  if (upsertError) {
    console.error("[api/blueprint/results] Results upsert error:", upsertError.message);
    return json({ error: "Failed to store results." }, 500);
  }

  // 5. Return the computed results as JSON.
  return json(results, 200);
}
