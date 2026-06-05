DROP POLICY IF EXISTS "team_formations_update" ON public.team_formations;

CREATE POLICY "team_formations_update" ON public.team_formations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM participants p
      JOIN leagues l ON l.id = p.league_id
      WHERE p.id = team_formations.participant_id
      AND (
        l.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.participant_id = p.id
          AND tm.user_id = auth.uid()
        )
      )
    )
  );
