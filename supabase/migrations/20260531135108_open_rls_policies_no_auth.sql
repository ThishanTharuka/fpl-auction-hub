-- Drop all existing auth-based policies
DROP POLICY IF EXISTS leagues_insert ON leagues;
DROP POLICY IF EXISTS leagues_update ON leagues;
DROP POLICY IF EXISTS leagues_delete ON leagues;
DROP POLICY IF EXISTS participants_insert ON participants;
DROP POLICY IF EXISTS participants_update ON participants;
DROP POLICY IF EXISTS participants_delete ON participants;
DROP POLICY IF EXISTS auction_results_insert ON auction_results;
DROP POLICY IF EXISTS auction_results_update ON auction_results;
DROP POLICY IF EXISTS auction_results_delete ON auction_results;

-- Leagues: anyone can insert/update/delete (no auth required)
CREATE POLICY leagues_insert ON leagues FOR INSERT WITH CHECK (true);
CREATE POLICY leagues_update ON leagues FOR UPDATE USING (true);
CREATE POLICY leagues_delete ON leagues FOR DELETE USING (true);

-- Participants: anyone can insert/update/delete
CREATE POLICY participants_insert ON participants FOR INSERT WITH CHECK (true);
CREATE POLICY participants_update ON participants FOR UPDATE USING (true);
CREATE POLICY participants_delete ON participants FOR DELETE USING (true);

-- Auction results: anyone can insert/update/delete
CREATE POLICY auction_results_insert ON auction_results FOR INSERT WITH CHECK (true);
CREATE POLICY auction_results_update ON auction_results FOR UPDATE USING (true);
CREATE POLICY auction_results_delete ON auction_results FOR DELETE USING (true);

-- Also ensure auction_nominations and auction_bids have open policies
DROP POLICY IF EXISTS auction_nominations_insert ON auction_nominations;
DROP POLICY IF EXISTS auction_nominations_update ON auction_nominations;
DROP POLICY IF EXISTS auction_nominations_delete ON auction_nominations;
DROP POLICY IF EXISTS auction_bids_insert ON auction_bids;
DROP POLICY IF EXISTS auction_bids_update ON auction_bids;
DROP POLICY IF EXISTS auction_bids_delete ON auction_bids;

CREATE POLICY auction_nominations_select ON auction_nominations FOR SELECT USING (true);
CREATE POLICY auction_nominations_insert ON auction_nominations FOR INSERT WITH CHECK (true);
CREATE POLICY auction_nominations_update ON auction_nominations FOR UPDATE USING (true);
CREATE POLICY auction_nominations_delete ON auction_nominations FOR DELETE USING (true);

CREATE POLICY auction_bids_select ON auction_bids FOR SELECT USING (true);
CREATE POLICY auction_bids_insert ON auction_bids FOR INSERT WITH CHECK (true);
CREATE POLICY auction_bids_update ON auction_bids FOR UPDATE USING (true);
CREATE POLICY auction_bids_delete ON auction_bids FOR DELETE USING (true);
