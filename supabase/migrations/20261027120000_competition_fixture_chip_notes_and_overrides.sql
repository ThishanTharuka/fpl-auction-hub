-- Chip rule neutralisation + manual score overrides for tournament fixtures.
--
-- 1. `chip_notes` records the chip audit trail auto-scored by the app
--    (e.g. "Triple Captain used in the league phase - not counted").
-- 2. `*_points_override` lets an admin pin a score that auto-score must never
--    overwrite, with `override_reason` / `overridden_by` / `overridden_at`
--    keeping an audit trail.

alter table public.competition_fixtures
  add column if not exists chip_notes jsonb,
  add column if not exists home_points_override integer,
  add column if not exists away_points_override integer,
  add column if not exists override_reason text,
  add column if not exists overridden_by uuid references auth.users(id) on delete set null,
  add column if not exists overridden_at timestamptz;

-- Repoint the scoring RPC so it also persists the chip audit trail. Payloads
-- without a `chip_notes` key leave the stored value untouched.
create or replace function public.apply_fixture_scores(
  p_fixtures jsonb,
  p_deciders jsonb default null,
  p_knockout_placements jsonb default null,
  p_competition_id uuid default null,
  p_competition_status text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  f jsonb;
  d jsonb;
  k jsonb;
begin
  -- Update fixtures with home_points, away_points, status, chip_notes
  if p_fixtures is not null then
    for f in select * from jsonb_array_elements(p_fixtures)
    loop
      update public.competition_fixtures
      set
        home_points = (f->>'home_points')::integer,
        away_points = (f->>'away_points')::integer,
        status = coalesce(f->>'status', 'scored'),
        chip_notes = case when f ? 'chip_notes' then f->'chip_notes' else chip_notes end
      where id = (f->>'id')::uuid;
    end loop;
  end if;

  -- Update decider fixtures if provided
  if p_deciders is not null then
    for d in select * from jsonb_array_elements(p_deciders)
    loop
      update public.competition_fixtures
      set
        home_team_id = nullif(d->>'home_team_id', '')::uuid,
        away_team_id = nullif(d->>'away_team_id', '')::uuid
      where id = (d->>'id')::uuid;
    end loop;
  end if;

  -- Update knockout placements if provided
  if p_knockout_placements is not null and p_competition_id is not null then
    for k in select * from jsonb_array_elements(p_knockout_placements)
    loop
      update public.competition_fixtures
      set
        home_team_id = nullif(k->>'home_team_id', '')::uuid,
        away_team_id = nullif(k->>'away_team_id', '')::uuid
      where competition_id = p_competition_id
        and phase = (k->>'phase')::text
        and leg = (k->>'leg')::integer;
    end loop;
  end if;

  -- Update competition status if provided
  if p_competition_id is not null and p_competition_status is not null then
    update public.competitions
    set status = p_competition_status
    where id = p_competition_id;
  end if;
end;
$$;

grant execute on function public.apply_fixture_scores(jsonb, jsonb, jsonb, uuid, text) to anon, authenticated, service_role;
