-- 039_harden_profiles_role.sql
-- CRITICAL-severity privilege-escalation fix: block any non-service client
-- (anon / authenticated) from changing a profile's `role` column or from
-- INSERTing a profile whose role is anything other than the 'user' default.
--
-- WHY THIS IS NEEDED
--   Migration 002 defines the "Users update own profile" UPDATE policy as
--     FOR UPDATE TO authenticated USING (auth.uid() = id)
--   with no column restriction and no WITH CHECK. Migration 017 adds
--     role TEXT NOT NULL DEFAULT 'user'  CHECK (role IN ('user','admin','moderator','support'))
--   and there is no trigger, column-level GRANT, or any other guard on
--   `role` (verified by grepping every migration). RLS alone cannot restrict
--   to specific columns — an UPDATE policy grants access to every column of
--   the row. Combined with the CHECK (which happily accepts 'admin'), any
--   signed-in user could PATCH their own `/rest/v1/profiles` row with
--
--     { "role": "admin" }
--
--   using their own JWT + the public anon key, and RLS would pass (own row).
--   That defeats requireAdmin, every admin action, and the /admin middleware.
--   The app-level whitelist in src/lib/profile/actions.ts does NOT cover
--   direct PostgREST calls, so the guard MUST live in the database.
--
--   Secondary vector: the "System creates profile" INSERT policy
--   (WITH CHECK (auth.uid() = id)) would let a user INSERT their own row with
--   role='admin' if their profile did not yet exist. The INSERT branch below
--   closes that too.
--
-- MECHANISM
--   A BEFORE trigger on `profiles` blocks role changes from any client role
--   except service_role. auth.role() returns the JWT role — 'anon',
--   'authenticated' or 'service_role' (this helper is already used in the
--   codebase, e.g. migration 019: auth.role() = 'service_role'). The service
--   client (createServiceClient, SUPABASE_SERVICE_ROLE_KEY) carries the
--   'service_role' JWT role, so admin actions that use it keep working.
--
--   IMPORTANT (verified): the signup trigger handle_new_user (migration 002)
--   INSERTs into profiles WITHOUT setting role explicitly, so NEW.role comes
--   from the column DEFAULT 'user' (migration 017). That means it passes the
--   INSERT check here REGARDLESS of auth context — no service-role needed for
--   signups. Only an explicit non-'user' role on INSERT (or any role change
--   on UPDATE) from a non-service client is rejected.
--
-- Idempotent: CREATE OR REPLACE for the function, DROP TRIGGER IF EXISTS then
-- CREATE TRIGGER — safe to re-run / apply to a live DB.
--
-- NOTE on security definer: the function is SECURITY DEFINER so the role
-- check isn't itself subject to RLS on profiles (it only reads the JWT role,
-- never row data), and SET search_path pins resolution to public.

CREATE OR REPLACE FUNCTION public.prevent_client_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only the service_role client may alter a profile's role. When applied
  -- outside the service client (e.g. direct SQL admin tools), auth.role()
  -- may be NULL — treat anything that is not 'service_role' as a client.
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'role changes are only permitted via the service-role client';
    END IF;
    IF TG_OP = 'INSERT' AND NEW.role IS DISTINCT FROM 'user' THEN
      RAISE EXCEPTION 'new profiles must have role ''user''';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_client_role_change ON profiles;
CREATE TRIGGER prevent_client_role_change
  BEFORE INSERT OR UPDATE OF role ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_client_role_change();
