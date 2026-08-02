-- H4: Invite pages may discover pending invites without exposing non-pending pairings.
CREATE POLICY "Anyone can read pending pairing by code" ON pairings
  FOR SELECT USING (status = 'pending');

-- Return only the inviter's display name through a narrowly scoped public RPC.
-- SECURITY DEFINER avoids granting broad profile-table access to anonymous callers.
CREATE OR REPLACE FUNCTION public.get_profile_display_name(profile_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(display_name, full_name, 'Someone')
  FROM public.profiles
  WHERE id = profile_id;
$$;

REVOKE ALL ON FUNCTION public.get_profile_display_name(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profile_display_name(uuid) TO anon, authenticated;
