// ──────────────────────────────────────────────────────────────
// SolidGround AI — Mobile Account Delete API (ADD for mobile client)
// ──────────────────────────────────────────────────────────────
// MOBILE-CLIENT ADD (owner-approved, Sprint 8 §18): a bearer-token
// endpoint for the React Native app to permanently delete the caller's
// account. NEW route only — no existing web-app behavior, file,
// migration, or RLS policy is touched. The existing web delete action
// (src/app/privacy/delete/actions.ts, deleteMyData) performs the same
// admin.auth.admin.deleteUser call for cookie-session callers; this
// route mirrors it exactly for the mobile bearer-token caller.
//
// WHY SERVER-SIDE: auth.users is managed by Supabase Auth — only the
// service role can delete a user. The service-role key must NEVER be
// bundled in the mobile client (Sprint 8 §18, audit), so deletion has
// to go through a server route.
//
// SECURITY:
//   • The target user id is derived ONLY from the authenticated bearer
//     token (authenticateRequest → getUser). A user_id supplied in the
//     request body is NEVER read (Sprint 8 §22: never trust
//     client-supplied user ids) — the body is optional and ignored.
//   • The audit row is written FIRST (service client) and contains no
//     private content and no email: action 'account.delete',
//     resource 'account', resource_id = user id, details { source:
//     'mobile' }. audit_logs.user_id is ON DELETE SET NULL (migration
//     004), so the deletion record survives the account with user_id
//     nulled.
//   • No manual cascade cleanup: the DB foreign keys remove the user's
//     data (see PR body for the verified cascade map). Blueprint
//     answers/results, coach conversations, journey rows, reports,
//     notifications, and pairings where the user is the inviter
//     cascade; pairings where the user is the invitee survive with
//     invitee_user_id SET NULL.
//
// MOBILE CONSUMER CONTRACT:
//   POST /api/account/delete
//   Authorization: Bearer <supabase access token>
//   Body: none required (an empty body or {} is accepted and ignored)
//   200 { "ok": true }
//   400 { "error": "..." }  non-JSON / non-object body
//   401 { "error": "..." }  missing or invalid token
//   500 { "error": "..." }  deletion failed (never a raw error)
// ──────────────────────────────────────────────────────────────
import { createClient as createAdminClient } from "@supabase/supabase-js";
import {
  authenticateRequest,
  auditLog,
  json,
  optionsResponse,
} from "@/lib/pairings/mobile-api";

export const runtime = "nodejs";

/** CORS preflight. */
export async function OPTIONS() {
  return optionsResponse();
}

/**
 * POST /api/account/delete — permanently delete the authenticated
 * user's account. The user id comes from the bearer token only.
 */
export async function POST(request: Request) {
  // 1. Bearer-token authentication (401 user-safe on failure).
  const auth = await authenticateRequest(request);
  if (!auth.ok) return auth.response;
  const { userId } = auth;

  // 2. Body is optional and IGNORED — the target is the authenticated
  //    user, never a client-supplied user id (Sprint 8 §22). Only
  //    reject a body that is not a JSON object (trivial shape check).
  try {
    const text = await request.text();
    if (text.trim().length > 0) {
      const parsed: unknown = JSON.parse(text);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return json({ error: "Invalid request body." }, 400);
      }
    }
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  // 3. Audit FIRST (best-effort, mirrors mobile-api auditLog): minimal
  //    details, no private content, no email.
  await auditLog(userId, "account.delete", "account", userId, { source: "mobile" });

  // 4. Delete the account — mirror deleteMyData exactly (same admin
  //    client, same call). No manual cascade cleanup: the DB FKs
  //    remove the user's data. On any failure → plain user-safe 500.
  try {
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) {
      console.error("[api/account/delete] Admin delete error:", error.message);
      return json({ error: "We could not complete deletion. Please try again." }, 500);
    }
  } catch (err) {
    console.error("[api/account/delete] Account deletion failed:", err);
    return json({ error: "We could not complete deletion. Please try again." }, 500);
  }

  // 5. Minimal user-safe response.
  return json({ ok: true }, 200);
}
