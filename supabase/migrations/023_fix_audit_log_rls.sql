-- H2: Admin audit entries are written only by trusted server-side service-role code.
DROP POLICY IF EXISTS "Allow inserts" ON admin_audit_log;
DROP POLICY IF EXISTS "Admins insert audit log" ON admin_audit_log;
-- Migration 004 used this permissive policy on the general audit table.
DROP POLICY IF EXISTS "Service can insert audit logs" ON audit_logs;
