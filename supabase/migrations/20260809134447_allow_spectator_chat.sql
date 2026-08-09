-- Allow spectators to chat when the auction creator enables it.

ALTER TABLE leagues
  ADD COLUMN IF NOT EXISTS allow_spectator_chat boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS chat_messages_select ON chat_messages;
CREATE POLICY chat_messages_select ON chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leagues
      WHERE leagues.id = chat_messages.league_id
        AND (
          leagues.created_by = auth.uid()
          OR leagues.allow_spectator_chat AND auth.role() = 'authenticated'
          OR EXISTS (
            SELECT 1 FROM team_members tm
            JOIN participants p ON p.id = tm.participant_id
            WHERE p.league_id = leagues.id
              AND tm.user_id = auth.uid()
              AND tm.status = 'approved'
          )
        )
    )
  );

DROP POLICY IF EXISTS chat_messages_insert ON chat_messages;
CREATE POLICY chat_messages_insert ON chat_messages
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM leagues
      WHERE leagues.id = chat_messages.league_id
        AND (
          leagues.created_by = auth.uid()
          OR leagues.allow_spectator_chat AND auth.role() = 'authenticated'
          OR EXISTS (
            SELECT 1 FROM team_members tm
            JOIN participants p ON p.id = tm.participant_id
            WHERE p.league_id = leagues.id
              AND tm.user_id = auth.uid()
              AND tm.status = 'approved'
          )
        )
    )
  );
