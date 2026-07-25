ALTER TABLE auction_bids
  DROP CONSTRAINT auction_bids_participant_id_fkey,
  ADD CONSTRAINT auction_bids_participant_id_fkey
    FOREIGN KEY (participant_id) REFERENCES participants(id)
    ON DELETE CASCADE;
