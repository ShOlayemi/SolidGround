-- 038_harden_pending_pairing_rls.sql
-- HIGH-severity RLS hardening: remove the over-broad public SELECT policy
-- on `pairings` added in migration 025, and drop its unused SECURITY DEFINER
-- helper function.
--
-- The migration-025 policy
--   CREATE POLICY "Anyone can read pending pairing by code" ON pairings
--     FOR SELECT USING (status = 'pending');
-- has no `TO` clause, so it applies to PUBLIC (anon + authenticated). It let
-- anyone query PostgREST directly and read EVERY pending pairing's full row —
-- including inviter_user_id, inviter_session_id, invitee_user_id,
-- relationship_type, and alignment_results (the inviter's complete
-- Compatibility Blueprint). That is sensitive relationship data exposed to
-- unauthenticated users.
--
-- The web invite flow does NOT depend on this policy: getInvite()/acceptInvite()
-- in src/lib/pairings/actions.ts and the mobile accept route read pending
-- pairings via the service-role client (which bypasses RLS). The
-- src/app/invite/[code]/page.tsx completed branch is gated by the existing
-- "Users read own pairings" policy. So dropping this policy breaks nothing.
--
-- The function public.get_profile_display_name(uuid) (also from 025) has zero
-- callers anywhere in the codebase and the anon/authenticated grant on it is a
-- pointless attack surface, so it is dropped rather than merely revoked.
--
-- Idempotent: both statements use IF EXISTS, safe to re-run / apply to a live DB.

DROP POLICY IF EXISTS "Anyone can read pending pairing by code" ON pairings;

DROP FUNCTION IF EXISTS public.get_profile_display_name(uuid);
