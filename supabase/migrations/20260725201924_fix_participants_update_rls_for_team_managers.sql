-- Allow league creators OR approved team managers to update participants
DROP POLICY IF EXISTS participants_update ON public.participants;

CREATE POLICY participants_update ON public.participants
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM leagues
      WHERE leagues.id = participants.league_id
      AND leagues.created_by = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.participant_id = participants.id
      AND team_members.user_id = auth.uid()
      AND team_members.status = 'approved'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM leagues
      WHERE leagues.id = participants.league_id
      AND leagues.created_by = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.participant_id = participants.id
      AND team_members.user_id = auth.uid()
      AND team_members.status = 'approved'
    )
  );
