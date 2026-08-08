-- Guard against stale-client bidding races.
--
-- Bids are computed client-side from realtime-synced state. When a client's
-- snapshot lags, it can compute a bid from an older (lower) current_bid and
-- overwrite a higher current_bid in the DB, making the price jump down.
-- This trigger enforces that an open nomination's current price can never
-- decrease, and that once a leader exists, any new bid must strictly outbid them.

create or replace function public.guard_bid_monotonic()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'open' and old.status = 'open' and (
    new.current_bid is distinct from old.current_bid
    or new.current_bidder_id is distinct from old.current_bidder_id
  ) then
    if new.current_bid < old.current_bid then
      raise exception 'Bid cannot be lower than the current bid';
    end if;
    if old.current_bidder_id is not null and new.current_bid <= old.current_bid then
      raise exception 'Bid must exceed the current bid';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_auction_nominations_bid_monotonic on auction_nominations;
create trigger trg_auction_nominations_bid_monotonic
before update on auction_nominations
for each row
execute function public.guard_bid_monotonic();
