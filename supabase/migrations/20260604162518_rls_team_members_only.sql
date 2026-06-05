-- Remove league creator exception from team_formations and auction_results RLS.
-- Only approved team members of the specific participant can modify.

DROP POLICY IF EXISTS team_formations_insert ON team_formations;
DROP POLICY IF EXISTS team_formations_update ON team_formations;

CREATE POLICY team_formations_insert ON team_formations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.participant_id = team_formations.participant_id
        AND team_members.user_id = auth.uid()
        AND team_members.status = 'approved'
    )
  );

CREATE POLICY team_formations_update ON team_formations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.participant_id = team_formations.participant_id
        AND team_members.user_id = auth.uid()
        AND team_members.status = 'approved'
    )
  );

DROP POLICY IF EXISTS auction_results_update ON auction_results;

CREATE POLICY auction_results_update ON auction_results
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.participant_id = auction_results.participant_id
        AND team_members.user_id = auth.uid()
        AND team_members.status = 'approved'
    )
  );
