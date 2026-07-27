CREATE TABLE IF NOT EXISTS chat_messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  league_id uuid NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  participant_id uuid REFERENCES participants(id) ON DELETE SET NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT message_not_empty CHECK (length(message) > 0)
);

CREATE INDEX chat_messages_league_id_created_at_idx ON chat_messages(league_id, created_at DESC);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY chat_messages_select ON chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leagues
      WHERE leagues.id = chat_messages.league_id
        AND (
          leagues.created_by = auth.uid()
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

CREATE POLICY chat_messages_insert ON chat_messages
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM leagues
      WHERE leagues.id = chat_messages.league_id
        AND (
          leagues.created_by = auth.uid()
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

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
