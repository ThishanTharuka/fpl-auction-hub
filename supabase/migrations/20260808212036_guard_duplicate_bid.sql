-- Reject exact duplicate bids.
--
-- A rapid double-submit (or a stale client) can push the same bid twice for the
-- same nomination, same team and same amount. The nomination update becomes a
-- no-op, so it bypasses the monotonic guard on auction_nominations — but the
-- duplicate bid row still lands in history. This trigger blocks that row.

create or replace function public.guard_duplicate_bid()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.auction_bids
    where nomination_id = new.nomination_id
      and participant_id = new.participant_id
      and amount = new.amount
  ) then
    raise exception 'Duplicate bid by the same team at the same amount';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_auction_bids_duplicate on auction_bids;
create trigger trg_auction_bids_duplicate
before insert on auction_bids
for each row
execute function public.guard_duplicate_bid();
