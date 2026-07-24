-- Atomic RPC to insert tournament matches
create or replace function public.insert_tournament_matches(p_matches jsonb)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.tournament_matches (stage_id, gw, round_number, round_label, home_team_id, away_team_id, status)
  select
    (x->>'stage_id')::uuid,
    (x->>'gw')::int,
    (x->>'round_number')::int,
    (x->>'round_label')::public.round_label,
    (x->>'home_team_id')::uuid,
    (x->>'away_team_id')::uuid,
    (x->>'status')::public.match_status
  from jsonb_array_elements(p_matches) as x;
end;
$$;

-- Atomic RPC to upsert tournament standings
create or replace function public.upsert_tournament_standings(p_standings jsonb)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.tournament_standings (stage_id, team_id, played, won, drawn, lost, fpl_pts_for, fpl_pts_against, match_points, position)
  select
    (x->>'stage_id')::uuid,
    (x->>'team_id')::uuid,
    (x->>'played')::int,
    (x->>'won')::int,
    (x->>'drawn')::int,
    (x->>'lost')::int,
    (x->>'fpl_pts_for')::int,
    (x->>'fpl_pts_against')::int,
    (x->>'match_points')::int,
    (x->>'position')::int
  from jsonb_array_elements(p_standings) as x
  on conflict (stage_id, team_id)
  do update set
    played = excluded.played,
    won = excluded.won,
    drawn = excluded.drawn,
    lost = excluded.lost,
    fpl_pts_for = excluded.fpl_pts_for,
    fpl_pts_against = excluded.fpl_pts_against,
    match_points = excluded.match_points,
    position = excluded.position;
end;
$$;
