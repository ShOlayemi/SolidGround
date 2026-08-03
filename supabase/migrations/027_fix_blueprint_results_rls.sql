-- H6: Partners need read access to each other's blueprint_results
-- when computing alignment. This SECURITY DEFINER function allows
-- cross-user blueprint_results reads for users connected by a pairing.

CREATE OR REPLACE FUNCTION public.get_partner_blueprint_results(
  target_session_id uuid,
  target_user_id uuid,
  caller_user_id uuid
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'session_id', br.session_id,
    'user_id', br.user_id,
    'category_results', br.category_results,
    'overall_score', br.overall_score,
    'overall_confidence', br.overall_confidence,
    'created_at', br.created_at,
    'updated_at', br.updated_at
  )
  FROM public.blueprint_results br
  WHERE br.session_id = target_session_id
    AND br.user_id = target_user_id
    AND EXISTS (
      SELECT 1 FROM public.pairings p
      WHERE (
        (p.inviter_user_id = target_user_id AND p.invitee_user_id = caller_user_id)
        OR (p.invitee_user_id = target_user_id AND p.inviter_user_id = caller_user_id)
      )
    );
$$;

REVOKE ALL ON FUNCTION public.get_partner_blueprint_results(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_partner_blueprint_results(uuid, uuid, uuid) TO authenticated;
