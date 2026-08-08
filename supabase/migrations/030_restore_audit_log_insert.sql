-- Restore authenticated audit logging for application actions.
-- Each user's audit entries must belong to that same authenticated user.
CREATE POLICY "Users can insert own audit logs" ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
