// ──────────────────────────────────────────────────────────────
// SolidGround AI — Mobile Discover Browse API (ADD for mobile client)
// ──────────────────────────────────────────────────────────────
// MOBILE-CLIENT ADD (owner-approved, Sprint 10 / S10-b): a bearer-token
// endpoint for the React Native app to browse/ search other users for
// Discover. NEW route only — no existing web-app behavior, file,
// migration, or RLS policy is touched.
//
// WHY SERVER-SIDE: web Discover browsing runs as a server action on the
// service client (discoverUsers in src/lib/connections/actions.ts). The
// mobile client cannot invoke a server action, and reading other users'
// profiles + the aggregate blueprint_results user list requires the
// service client (profiles RLS is own-row-only). This route composes the
// SAME steps for the mobile bearer-token caller.
//
// Known web gap fixed here (recon §6 risk 2): web discoverUsers does NOT
// exclude blocked users from the listing. This route filters candidates
// through usersAreBlocked (EITHER direction) so a user you blocked, or
// who blocked you, never appears — pressable-Connect surfaces the generic
// "no longer available" otherwise. Blocked-user enumforcement is
// therefore at the correct layer for the mobile surface.
//
// MOBILE CONSUMER CONTRACT:
//   GET /api/discover/users?q=<name>&page=<0-based>&mode=<romantic|platonic>
//   Authorization: Bearer <supabase access token>
//   200 { "users": DiscoverUser[], "hasMore": boolean }  (DiscoverUser =
//       { id, display_name, full_name, relationship_status, gender, age,
//         avatar_url, bio, hasPending, incomingPending })
//   401 { "error": "..." }  missing or invalid token
//   500 { "error": "..." }  server failure (never a raw DB error)
//
// Discoverability gate: a user is listed iff they have a completed
// Blueprint (present in blueprint_results) and are not already paired
// with the caller and not self. `mode` optionally scopes pending-request
// annotations to requests of that relationship type (romantic | platonic);
// omitted = all.
// ──────────────────────────────────────────────────────────────
import { createServiceClient } from "@/lib/supabase/server";
import {
  authenticateRequest,
  json,
  optionsResponse,
} from "@/lib/pairings/mobile-api";
import { usersAreBlocked } from "@/lib/pairings/blocked";

export const runtime = "nodejs";

/** CORS preflight. */
export async function OPTIONS() {
  return optionsResponse();
}

export type DiscoverUser = {
  id: string;
  display_name: string;
  full_name: string;
  relationship_status: string | null;
  gender: "male" | "female" | "other" | null;
  age: number | null;
  avatar_url: string | null;
  bio: string | null;
  hasPending: boolean;
  incomingPending: boolean;
};

const PAGE_SIZE = 20;

/**
 * GET /api/discover/users — browse/search discoverable users.
 */
export async function GET(request: Request) {
  // 1. Bearer-token authentication. The authenticated user id is derived
  //    ONLY from the token — the client is never trusted for it.
  const auth = await authenticateRequest(request);
  if (!auth.ok) return auth.response;
  const { userId } = auth;

  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim();
  const rawPage = url.searchParams.get("page");
  const page = rawPage ? Math.max(0, Math.floor(Number(rawPage)) || 0) : 0;
  const mode = url.searchParams.get("mode");
  // Optional relationship-type scope for request/pending annotations.
  const relationshipType: "romantic" | "platonic" | null =
    mode === "platonic" ? "platonic" : mode === "romantic" ? "romantic" : null;

  const service = await createServiceClient();

  // 2. Discoverability gate: users with a completed Blueprint, minus self.
  const { data: completed } = await service
    .from("blueprint_results")
    .select("user_id");
  const ids = [
    ...new Set(
      (completed ?? []).map((x) => x.user_id).filter((id) => id !== userId),
    ),
  ];
  if (!ids.length) return json({ users: [], hasMore: false }, 200);

  // 3. Exclude users already paired with me (invite-code OR connection).
  const { data: pairings } = await service
    .from("pairings")
    .select("inviter_user_id,invitee_user_id")
    .or(`inviter_user_id.eq.${userId},invitee_user_id.eq.${userId}`);
  const paired = new Set(
    (pairings ?? []).flatMap((p) => [p.inviter_user_id, p.invitee_user_id]).filter(Boolean),
  );
  const eligible = ids.filter((id) => !paired.has(id));
  if (!eligible.length) return json({ users: [], hasMore: false }, 200);

  // 4. Profiles via the service client (own-row-only RLS requires it).
  const { data: profiles } = await service
    .from("profiles")
    .select("id,display_name,full_name,relationship_status,gender,age,avatar_url,bio")
    .in("id", eligible);

  // 5. Pending requests between me and candidates (optionally mode-scoped).
  let reqQuery = service
    .from("connection_requests")
    .select("from_user_id,to_user_id,relationship_type")
    .eq("status", "pending")
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);
  if (relationshipType) {
    reqQuery = reqQuery.eq("relationship_type", relationshipType);
  }
  const { data: reqRows } = await reqQuery;
  const reqs = reqRows ?? [];

  // 6. Name substring filter (mirrors web discoverUsers), then EXCLUDE
  //    blocked users in EITHER direction (web gap fix). Fail closed: a
  //    block-check error propagates as a 500 rather than leaking/listing.
  const term = query.toLowerCase();
  const nameFiltered = (profiles ?? []).filter(
    (p) =>
      !term ||
      [p.display_name, p.full_name].some((v) =>
        (v ?? "").toLowerCase().includes(term),
      ),
  );
  const blocked = new Set<string>();
  for (const p of nameFiltered) {
    let isBlocked: boolean;
    try {
      isBlocked = await usersAreBlocked(service, userId, p.id);
    } catch (err) {
      console.error("[api/discover/users] Block check error:", err);
      return json({ error: "Failed to load users." }, 500);
    }
    if (isBlocked) blocked.add(p.id);
  }
  const filtered = nameFiltered
    .filter((p) => !blocked.has(p.id))
    .sort((x, y) =>
      (x.display_name ?? x.full_name).localeCompare(y.display_name ?? y.full_name),
    );

  // 7. Paginate + annotate pending flags.
  const start = page * PAGE_SIZE;
  const slice = filtered.slice(start, start + PAGE_SIZE);
  const users: DiscoverUser[] = slice.map((p) => {
    const outgoing = reqs.some(
      (r) => r.from_user_id === userId && r.to_user_id === p.id,
    );
    return {
      id: p.id,
      display_name: p.display_name ?? p.full_name,
      full_name: p.full_name,
      relationship_status: p.relationship_status,
      gender: p.gender,
      age: p.age,
      avatar_url: p.avatar_url,
      bio: p.bio,
      hasPending: outgoing,
      incomingPending: reqs.some(
        (r) => r.from_user_id === p.id && r.to_user_id === userId,
      ),
    };
  });
  return json({ users, hasMore: start + PAGE_SIZE < filtered.length }, 200);
}
