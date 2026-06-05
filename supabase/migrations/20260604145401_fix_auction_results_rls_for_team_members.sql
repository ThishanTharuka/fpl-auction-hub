DROP POLICY IF EXISTS "auction_results_update" ON public.auction_results;

CREATE POLICY "auction_results_update" ON public.auction_results
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM leagues
      WHERE leagues.id = auction_results.league_id
      AND (
        leagues.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM team_members tm
          JOIN participants p ON p.id = tm.participant_id
          WHERE p.league_id = leagues.id
          AND tm.user_id = auth.uid()
        )
      )
    )
  );
