-- H3: A comparison report may only be created for a pairing the caller belongs to.
DROP POLICY IF EXISTS "Service inserts comparison reports" ON comparison_reports;
CREATE POLICY "Partners can insert own report" ON comparison_reports
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM pairings
      WHERE pairings.id = pairing_id
      AND (pairings.inviter_user_id = auth.uid() OR pairings.invitee_user_id = auth.uid())
    )
  );
