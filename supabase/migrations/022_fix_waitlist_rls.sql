-- H1: Waitlist email addresses must never be readable by regular users.
-- Service-role clients bypass RLS and remain the only trusted read path.
DROP POLICY IF EXISTS "Service can read" ON waitlist;
DROP POLICY IF EXISTS "Authenticated users can read waitlist" ON waitlist;
