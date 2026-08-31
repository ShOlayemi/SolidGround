// ──────────────────────────────────────────────────────────────
// SolidGround — Expo Push helper (fire-and-forget)
// ──────────────────────────────────────────────────────────────
// ADD-only server-side module. Sends a single push notification to one
// user's registered Expo device token via expo-server-sdk.
//
// HARD GUARANTEES (working rules):
//   • FIRE-AND-FORGET — ANY failure is caught, logged, and swallowed. This
//     function never throws into the caller, so a push failure can never
//     break the source action (connection request send, message send, ...).
//   • DEGRADATION — when `process.env.EXPO_ACCESS_TOKEN` is unset (no Expo
//     access token configured in the deploy env), sending is skipped
//     silently; in-app notifications are completely unaffected.
//   • DB-LEVEL AUTH — reads of `push_tokens` run through the SERVICE client
//     (the caller passes it in), so a push can be sent to any verified
//     recipient regardless of which client initiated the event. The userId
//     is always the authenticated/verified recipient id, never a
//     client-supplied one.
//   • PREFERENCES — mirrors createNotification's in-app gate: an explicit
//     `push[type] = false` skips; otherwise the `in_app[type] = false`
//     fallback also skips.
//   • No real Expo call is ever made by the test suite — expo-server-sdk
//     is mocked there.
// ──────────────────────────────────────────────────────────────
import { Expo } from "expo-server-sdk";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Payload for a single-user push. `type` gates the per-type preference. */
export type PushPayload = {
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

/**
 * Send a fire-and-forget Expo push to one user. Never throws; never breaks
 * the caller. Degrades silently (no-op) when:
 *   • EXPO_ACCESS_TOKEN is unset,
 *   • the recipient disabled push for this type (preferences),
 *   • the recipient has no registered push token,
 *   • the stored token is not a valid Expo push token,
 *   • Expo rejects/throws.
 *
 * @param supabase  a SERVICE client (bypasses RLS so any recipient's token
 *                  and preferences can be read). The caller responsible for
 *                  the event passes its service client.
 * @param userId    the verified recipient's user id.
 * @param payload   title/body/data + notification type for the pref gate.
 */
export async function sendPushForUser(
  supabase: SupabaseClient,
  userId: string,
  payload: PushPayload,
): Promise<void> {
  try {
    const accessToken = process.env.EXPO_ACCESS_TOKEN;
    if (!accessToken) {
      // Degradation: Expo push not configured for this environment. Skip
      // quietly — the in-app notification flow is unchanged.
      return;
    }

    // Respect notification preferences (mirrors createNotification): honor
    // an explicit push preference for the type, else fall back to the in_app
    // preference for that type. If either says `false`, skip.
    const { data: prefs } = await supabase
      .from("profiles")
      .select("notification_preferences")
      .eq("id", userId)
      .maybeSingle();
    const prefsRec = (prefs?.notification_preferences as
      | { push?: Record<string, boolean>; in_app?: Record<string, boolean> }
      | null
      | undefined);
    const pushPref = prefsRec?.push?.[payload.type];
    const inAppPref = prefsRec?.in_app?.[payload.type];
    if (pushPref === false || (pushPref === undefined && inAppPref === false)) {
      return;
    }

    // Read the recipient's registered push token (one token per user).
    const { data: row } = await supabase
      .from("push_tokens")
      .select("expo_push_token")
      .eq("user_id", userId)
      .maybeSingle();
    const token = row?.expo_push_token;
    if (!token || !Expo.isExpoPushToken(token)) {
      return;
    }

    const expo = new Expo({ accessToken });
    const message = {
      to: token,
      sound: "default",
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
    };

    // Chunk (single message here) and send through the Expo client.
    for (const chunk of expo.chunkPushNotifications([message])) {
      await expo.sendPushNotificationsAsync(chunk);
    }
  } catch (err) {
    // Fire-and-forget: log and swallow — never throw into the caller.
    console.error("[push] sendPushForUser error:", err);
  }
}
