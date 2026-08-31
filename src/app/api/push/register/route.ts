// ──────────────────────────────────────────────────────────────
// SolidGround — Expo push-token registration (ADD for mobile client)
// ──────────────────────────────────────────────────────────────
// MOBILE-CLIENT ADD (owner-approved, Expo Push step 1): the mobile client
// registers/updates its device's Expo push token so the server can send it
// fire-and-forget push notifications for the same events that already
// produce in-app notifications. NEW route + NEW `push_tokens` table only —
// no existing web-app behavior, file, migration, or RLS policy is touched;
// the web app's live behavior is unchanged.
//
//   POST /api/push/register
//   Authorization: Bearer <supabase access token>
//   Content-Type: application/json
//   Request: { "expoPushToken": string, "platform": "ios" | "android" | null }
//
//   Response 200: { "ok": true }
//   Errors:
//     401 → token rejected ("Authentication required")
//     400 → malformed body / missing expoPushToken / invalid Expo token /
//           invalid platform
//     500 → persistence failure
//   OPTIONS → 204 with CORS headers (preflight).
//
// DESIGN:
//   • BEARER AUTH — authenticateRequest() verifies the caller's access
//     token and returns a token-bound Supabase client + the verified userId.
//     The UPSERT is scoped to auth.uid() ONLY — a user can never register a
//     token for, overwrite, or read another user's token (enforced at the DB
//     level by push_tokens RLS; the route never trusts a client-supplied id).
//   • UPSERT — one token per user (UNIQUE(user_id)); re-sending replaces it.
//   • VALIDATION — manual parsing (no zod), mirrors the other mobile routes.
// ──────────────────────────────────────────────────────────────
import {
  authenticateRequest,
  json,
  optionsResponse,
} from "@/lib/pairings/mobile-api";
import { Expo } from "expo-server-sdk";

export const runtime = "nodejs";

/** CORS preflight (shared helper — mirrors the pairing routes). */
export async function OPTIONS() {
  return optionsResponse();
}

type RegisterBody = {
  expoPushToken?: unknown;
  platform?: unknown;
};

/**
 * POST /api/push/register — register/update the caller's Expo push token.
 */
export async function POST(request: Request) {
  // 1. Bearer-token authentication (shared helper — mirrors the pairing +
  //    coach routes). Returns the token-bound client + verified userId.
  const auth = await authenticateRequest(request);
  if (!auth.ok) return auth.response;
  const { supabase, userId } = auth;

  // 2. Parse + validate the body (manual, no zod).
  let body: RegisterBody;
  try {
    body = (await request.json()) as RegisterBody;
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }
  const { expoPushToken, platform } = body;

  if (typeof expoPushToken !== "string" || expoPushToken.trim().length === 0) {
    return json({ error: "expoPushToken is required." }, 400);
  }
  if (!Expo.isExpoPushToken(expoPushToken)) {
    return json({ error: "Invalid Expo push token." }, 400);
  }
  if (
    platform !== undefined &&
    platform !== null &&
    platform !== "ios" &&
    platform !== "android"
  ) {
    return json({ error: "platform must be 'ios' or 'android'." }, 400);
  }

  // 3. UPSERT scoped to the authenticated user (never a client-supplied id).
  //    Runs on the token-bound client so push_tokens RLS (auth.uid() =
  //    user_id) authorizes the write at the database level.
  const { error } = await supabase
    .from("push_tokens")
    .upsert(
      {
        user_id: userId,
        expo_push_token: expoPushToken,
        platform: platform ?? null,
      },
      { onConflict: "user_id" },
    );
  if (error) {
    console.error("[api/push/register] Upsert error:", error.message);
    return json({ error: "Failed to register push token." }, 500);
  }

  return json({ ok: true }, 200);
}
