-- H5 defense-in-depth: admin audit writes are performed with the service-role client.
-- No authenticated INSERT policy is permitted; service_role bypasses RLS.
DROP POLICY IF EXISTS "Allow inserts" ON admin_audit_log;
DROP POLICY IF EXISTS "Admins insert audit log" ON admin_audit_log;
