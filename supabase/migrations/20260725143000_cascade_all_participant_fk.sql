ALTER TABLE auction_bids
  DROP CONSTRAINT auction_bids_participant_id_fkey,
  ADD CONSTRAINT auction_bids_participant_id_fkey
    FOREIGN KEY (participant_id) REFERENCES participants(id)
    ON DELETE CASCADE;

ALTER TABLE auction_nominations
  DROP CONSTRAINT auction_nominations_current_bidder_id_fkey,
  ADD CONSTRAINT auction_nominations_current_bidder_id_fkey
    FOREIGN KEY (current_bidder_id) REFERENCES participants(id)
    ON DELETE CASCADE;

ALTER TABLE auction_nominations
  DROP CONSTRAINT auction_nominations_winning_participant_id_fkey,
  ADD CONSTRAINT auction_nominations_winning_participant_id_fkey
    FOREIGN KEY (winning_participant_id) REFERENCES participants(id)
    ON DELETE CASCADE;

ALTER TABLE auction_results
  DROP CONSTRAINT auction_results_participant_id_fkey,
  ADD CONSTRAINT auction_results_participant_id_fkey
    FOREIGN KEY (participant_id) REFERENCES participants(id)
    ON DELETE CASCADE;
