-- Track bench placement separately from the player's auction position.
--
-- position_slot stores the real position (GKP/DEF/MID/FWD) written at gavel
-- time and read by the auction views and bidding limits. The /teams lineup
-- editor previously overwrote it with 'BENCH', which hid players from those
-- views and skewed position limits. Bench status now lives in is_bench.

ALTER TABLE public.auction_results
  ADD COLUMN IF NOT EXISTS is_bench boolean NOT NULL DEFAULT false;

-- Backfill: restore the real position for players benched by the lineup
-- editor, keeping their bench status in is_bench.
UPDATE public.auction_results r
SET position_slot = n.position,
    is_bench = true
FROM public.auction_nominations n
WHERE r.position_slot = 'BENCH'
  AND n.league_id = r.league_id
  AND n.fpl_player_id = r.fpl_player_id
  AND n.status = 'sold'
  AND n.position IS NOT NULL;
