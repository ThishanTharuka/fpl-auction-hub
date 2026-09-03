-- Tournament (competition) tables: two leagues combined into a config-driven tournament
-- with real FPL gameweek scoring. No tournament/competition tables existed before this.

-- Competitions: the tournament entity, referencing two leagues as peers (Group A / Group B).
create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id),
  league_a_id uuid not null references public.leagues(id) on delete cascade,
  league_b_id uuid not null references public.leagues(id) on delete cascade,
  format_config jsonb not null,
  start_gw integer not null,
  status text not null default 'setup',
  created_at timestamptz not null default now(),
  constraint competitions_leagues_distinct check (league_a_id <> league_b_id)
);

create index if not exists competitions_created_by_idx on public.competitions (created_by);

-- Competition teams: snapshot of participating teams (Group A from league A, Group B from league B).
-- Names/colors/fpl_manager_id are snapshotted at creation; admin can refresh managers later.
create table if not exists public.competition_teams (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  group_label text not null check (group_label in ('A', 'B')),
  participant_id uuid not null references public.participants(id),
  league_id uuid not null references public.leagues(id),
  name text not null,
  color text,
  avatar_url text,
  fpl_manager_id bigint,
  team_number integer not null,
  created_at timestamptz not null default now(),
  constraint competition_teams_group_number unique (competition_id, group_label, team_number),
  constraint competition_teams_participant unique (competition_id, participant_id)
);

create index if not exists competition_teams_competition_idx on public.competition_teams (competition_id);

-- Competition fixtures: every tie, one row per leg. Group ties may span 1-2 legs (per format_config).
-- Aggregated points across legs decide a tie's result. home/away NULL only for bye slots.
create table if not exists public.competition_fixtures (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  stage text not null check (stage in ('group', 'knockout')),
  phase text not null,
  tie_index integer not null,
  leg integer not null default 1,
  gw integer not null,
  home_team_id uuid references public.competition_teams(id),
  away_team_id uuid references public.competition_teams(id),
  home_points integer,
  away_points integer,
  status text not null default 'scheduled',
  created_at timestamptz not null default now(),
  constraint competition_fixtures_leg unique (competition_id, tie_index, gw)
);

create index if not exists competition_fixtures_competition_idx on public.competition_fixtures (competition_id);
create index if not exists competition_fixtures_competition_gw_idx on public.competition_fixtures (competition_id, gw);

-- RLS: reads are public (public tournament pages); writes are owner-scoped to the creator.
alter table public.competitions enable row level security;
alter table public.competition_teams enable row level security;
alter table public.competition_fixtures enable row level security;

-- Competitions
create policy competitions_select on public.competitions for select using (true);
create policy competitions_insert on public.competitions for insert with check (auth.uid() = created_by);
create policy competitions_update on public.competitions for update using (auth.uid() = created_by);
create policy competitions_delete on public.competitions for delete using (auth.uid() = created_by);

-- Competition teams: writes flow through the owning competition
create policy competition_teams_select on public.competition_teams for select using (true);
create policy competition_teams_insert on public.competition_teams for insert with check (
  exists (select 1 from public.competitions c where c.id = competition_id and c.created_by = auth.uid())
);
create policy competition_teams_update on public.competition_teams for update using (
  exists (select 1 from public.competitions c where c.id = competition_id and c.created_by = auth.uid())
);
create policy competition_teams_delete on public.competition_teams for delete using (
  exists (select 1 from public.competitions c where c.id = competition_id and c.created_by = auth.uid())
);

-- Competition fixtures
create policy competition_fixtures_select on public.competition_fixtures for select using (true);
create policy competition_fixtures_insert on public.competition_fixtures for insert with check (
  exists (select 1 from public.competitions c where c.id = competition_id and c.created_by = auth.uid())
);
create policy competition_fixtures_update on public.competition_fixtures for update using (
  exists (select 1 from public.competitions c where c.id = competition_id and c.created_by = auth.uid())
);
create policy competition_fixtures_delete on public.competition_fixtures for delete using (
  exists (select 1 from public.competitions c where c.id = competition_id and c.created_by = auth.uid())
);