-- Add config columns to leagues
ALTER TABLE leagues
  ADD COLUMN IF NOT EXISTS timer_seconds integer DEFAULT 45,
  ADD COLUMN IF NOT EXISTS bid_increment numeric DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS base_price_gkp numeric DEFAULT 4.0,
  ADD COLUMN IF NOT EXISTS base_price_def numeric DEFAULT 4.5,
  ADD COLUMN IF NOT EXISTS base_price_mid numeric DEFAULT 5.0,
  ADD COLUMN IF NOT EXISTS base_price_fwd numeric DEFAULT 5.0,
  ADD COLUMN IF NOT EXISTS max_per_club integer DEFAULT 3,
  ADD COLUMN IF NOT EXISTS squad_size integer DEFAULT 15,
  ADD COLUMN IF NOT EXISTS max_gkp integer DEFAULT 2,
  ADD COLUMN IF NOT EXISTS max_def integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS max_mid integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS max_fwd integer DEFAULT 3,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'setup';

-- Live nomination / bid state (one row = one nomination, updated in place)
CREATE TABLE IF NOT EXISTS auction_nominations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid REFERENCES leagues(id) ON DELETE CASCADE NOT NULL,
  fpl_player_id integer NOT NULL,
  player_name text NOT NULL,
  player_team text,
  position text NOT NULL,
  starting_price numeric NOT NULL,
  current_bid numeric NOT NULL,
  current_bidder_id uuid REFERENCES participants(id),
  current_bidder_name text,
  bid_end_time timestamptz,
  status text DEFAULT 'open',
  winning_participant_id uuid REFERENCES participants(id),
  winning_price numeric,
  created_at timestamptz DEFAULT now()
);

-- Bid history
CREATE TABLE IF NOT EXISTS auction_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nomination_id uuid REFERENCES auction_nominations(id) ON DELETE CASCADE NOT NULL,
  participant_id uuid REFERENCES participants(id),
  participant_name text NOT NULL,
  amount numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Realtime on the two live tables
ALTER PUBLICATION supabase_realtime ADD TABLE auction_nominations;
ALTER PUBLICATION supabase_realtime ADD TABLE auction_bids;
