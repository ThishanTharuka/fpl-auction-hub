-- Legacy lineup editors stored bench status by overwriting position_slot with
-- 'BENCH', which hides players from auction views and skews position limits.
-- The original is_bench migration only backfilled once, so later stale-client
-- writes reintroduced 'BENCH' rows (e.g. Pope/Eze/Van den Berg/Xhaka in Group B).
-- Re-run the backfill and, going forward, reject 'BENCH' in position_slot —
-- bench status lives in is_bench.

-- 1) Re-backfill the real position for any residual 'BENCH' rows.
UPDATE public.auction_results r
SET position_slot = n.position,
    is_bench = true
FROM public.auction_nominations n
WHERE r.position_slot = 'BENCH'
  AND n.league_id = r.league_id
  AND n.fpl_player_id = r.fpl_player_id
  AND n.status = 'sold'
  AND n.position IS NOT NULL;

-- 2) Guard: never allow 'BENCH' to be written to position_slot again.
CREATE OR REPLACE FUNCTION public.auction_results_reject_bench_position_slot()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.position_slot = 'BENCH' THEN
    RAISE EXCEPTION 'auction_results.position_slot cannot be BENCH; bench status lives in is_bench';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auction_results_reject_bench_position_slot ON public.auction_results;
CREATE TRIGGER auction_results_reject_bench_position_slot
BEFORE INSERT OR UPDATE OF position_slot ON public.auction_results
FOR EACH ROW EXECUTE FUNCTION public.auction_results_reject_bench_position_slot();
