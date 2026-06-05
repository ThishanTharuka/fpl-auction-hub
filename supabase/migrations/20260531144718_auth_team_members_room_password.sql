-- 1. Add room_password to leagues
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS room_password text;

-- 2. Create team_members table (claim/approval flow, up to 2 managers per team)
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  user_name text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE(league_id, user_id),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Enable RLS
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- 3. RLS for team_members
CREATE POLICY team_members_select ON team_members FOR SELECT USING (true);
CREATE POLICY team_members_insert ON team_members FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY team_members_update ON team_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM leagues
      WHERE leagues.id = team_members.league_id
        AND leagues.created_by = auth.uid()
    )
  );
CREATE POLICY team_members_delete ON team_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM leagues
      WHERE leagues.id = team_members.league_id
        AND leagues.created_by = auth.uid()
    )
  );

-- 4. Tighten leagues RLS: only authenticated can create, only creator can update/delete
DROP POLICY IF EXISTS leagues_insert ON leagues;
DROP POLICY IF EXISTS leagues_update ON leagues;
DROP POLICY IF EXISTS leagues_delete ON leagues;

CREATE POLICY leagues_insert ON leagues
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY leagues_update ON leagues
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY leagues_delete ON leagues
  FOR DELETE USING (created_by = auth.uid());

-- 5. Participants: only league creator can insert/delete, anyone can read
DROP POLICY IF EXISTS participants_insert ON participants;
DROP POLICY IF EXISTS participants_delete ON participants;

CREATE POLICY participants_insert ON participants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM leagues
      WHERE leagues.id = participants.league_id
        AND leagues.created_by = auth.uid()
    )
  );

CREATE POLICY participants_delete ON participants
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM leagues
      WHERE leagues.id = participants.league_id
        AND leagues.created_by = auth.uid()
    )
  );

-- auction_nominations: only league creator can insert/delete, approved members can see
DROP POLICY IF EXISTS auction_nominations_insert ON auction_nominations;
DROP POLICY IF EXISTS auction_nominations_update ON auction_nominations;
DROP POLICY IF EXISTS auction_nominations_delete ON auction_nominations;

CREATE POLICY auction_nominations_insert ON auction_nominations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM leagues
      WHERE leagues.id = auction_nominations.league_id
        AND leagues.created_by = auth.uid()
    )
  );
CREATE POLICY auction_nominations_update ON auction_nominations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM leagues
      WHERE leagues.id = auction_nominations.league_id
        AND leagues.created_by = auth.uid()
    )
  );
CREATE POLICY auction_nominations_delete ON auction_nominations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM leagues
      WHERE leagues.id = auction_nominations.league_id
        AND leagues.created_by = auth.uid()
    )
  );

-- auction_bids: approved members can insert, creator can manage
DROP POLICY IF EXISTS auction_bids_insert ON auction_bids;
DROP POLICY IF EXISTS auction_bids_update ON auction_bids;
DROP POLICY IF EXISTS auction_bids_delete ON auction_bids;

CREATE POLICY auction_bids_insert ON auction_bids
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN leagues l ON l.id = tm.league_id
      JOIN auction_nominations an ON an.id = auction_bids.nomination_id
      WHERE tm.user_id = auth.uid()
        AND tm.status = 'approved'
        AND tm.league_id = an.league_id
    )
  );
CREATE POLICY auction_bids_update ON auction_bids
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auction_nominations an
      JOIN leagues l ON l.id = an.league_id
      WHERE an.id = auction_bids.nomination_id
        AND l.created_by = auth.uid()
    )
  );
CREATE POLICY auction_bids_delete ON auction_bids
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM auction_nominations an
      JOIN leagues l ON l.id = an.league_id
      WHERE an.id = auction_bids.nomination_id
        AND l.created_by = auth.uid()
    )
  );

-- auction_results: only creator can insert/delete
DROP POLICY IF EXISTS auction_results_insert ON auction_results;
DROP POLICY IF EXISTS auction_results_update ON auction_results;
DROP POLICY IF EXISTS auction_results_delete ON auction_results;

CREATE POLICY auction_results_insert ON auction_results
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM leagues
      WHERE leagues.id = auction_results.league_id
        AND leagues.created_by = auth.uid()
    )
  );
CREATE POLICY auction_results_update ON auction_results
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM leagues
      WHERE leagues.id = auction_results.league_id
        AND leagues.created_by = auth.uid()
    )
  );
CREATE POLICY auction_results_delete ON auction_results
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM leagues
      WHERE leagues.id = auction_results.league_id
        AND leagues.created_by = auth.uid()
    )
  );

-- Enable realtime on team_members
ALTER PUBLICATION supabase_realtime ADD TABLE team_members;
