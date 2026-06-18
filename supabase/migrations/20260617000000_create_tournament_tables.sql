-- ─── ENUMS ─────────────────────────────────────────────

create type public.tournament_status as enum ('draft', 'active', 'completed');

create type public.scoring_mode as enum ('total_points', 'head_to_head');

create type public.stage_type as enum ('league', 'round_robin', 'swiss', 'knockout');

create type public.match_status as enum ('scheduled', 'completed', 'bye');

create type public.round_label as enum (
  'league', 'swiss',
  'r32', 'r16', 'qf', 'sf', 'third_place', 'final'
);

-- ─── TOURNAMENTS ───────────────────────────────────────

create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  league_id uuid references public.leagues(id) on delete cascade not null,
  name text not null,
  start_gw integer not null default 1,
  end_gw integer not null default 38,
  status public.tournament_status not null default 'draft',
  created_by uuid,
  created_at timestamptz default now()
);

-- ─── STAGES ────────────────────────────────────────────

create table public.tournament_stages (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete cascade not null,
  name text not null,
  stage_order integer not null,
  type public.stage_type not null,
  scoring_mode public.scoring_mode not null default 'total_points',
  start_gw integer not null,
  end_gw integer not null,
  advance_qualifiers integer,
  config jsonb not null default '{}',
  status public.tournament_status not null default 'draft',
  created_at timestamptz default now(),
  unique (tournament_id, stage_order)
);

-- ─── MATCHES ───────────────────────────────────────────

create table public.tournament_matches (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid references public.tournament_stages(id) on delete cascade not null,
  gw integer not null,
  round_number integer not null,
  round_label public.round_label not null default 'league',
  home_team_id uuid references public.participants(id),
  away_team_id uuid references public.participants(id),
  home_fpl_pts integer,
  away_fpl_pts integer,
  winner_team_id uuid references public.participants(id),
  status public.match_status not null default 'scheduled',
  created_at timestamptz default now()
);

-- ─── STANDINGS ─────────────────────────────────────────

create table public.tournament_standings (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid references public.tournament_stages(id) on delete cascade not null,
  team_id uuid references public.participants(id) not null,
  played integer default 0,
  won integer default 0,
  drawn integer default 0,
  lost integer default 0,
  fpl_pts_for integer default 0,
  fpl_pts_against integer default 0,
  fpl_pts_diff integer generated always as (fpl_pts_for - fpl_pts_against) stored,
  match_points integer default 0,
  position integer,
  unique (stage_id, team_id)
);

-- ─── INDEXES ───────────────────────────────────────────

create index idx_tournaments_league on public.tournaments(league_id);
create index idx_tournament_stages_tournament on public.tournament_stages(tournament_id);
create index idx_tournament_matches_stage on public.tournament_matches(stage_id);
create index idx_tournament_matches_gw on public.tournament_matches(gw);
create index idx_tournament_standings_stage on public.tournament_standings(stage_id);
create index idx_tournament_standings_position on public.tournament_standings(stage_id, position);

-- ─── RLS ───────────────────────────────────────────────

alter table public.tournaments enable row level security;
alter table public.tournament_stages enable row level security;
alter table public.tournament_matches enable row level security;
alter table public.tournament_standings enable row level security;

-- All authenticated users can read tournament data
create policy "Authenticated users can read tournaments"
  on public.tournaments for select
  to authenticated
  using (true);

create policy "Authenticated users can read stages"
  on public.tournament_stages for select
  to authenticated
  using (true);

create policy "Authenticated users can read matches"
  on public.tournament_matches for select
  to authenticated
  using (true);

create policy "Authenticated users can read standings"
  on public.tournament_standings for select
  to authenticated
  using (true);

-- Only the tournament creator can manage tournaments and stages
create policy "Creator manages tournaments"
  on public.tournaments for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "Creator manages tournaments"
  on public.tournaments for update
  to authenticated
  using (created_by = auth.uid());

create policy "Creator manages tournaments"
  on public.tournaments for delete
  to authenticated
  using (created_by = auth.uid());

create policy "Creator manages stages"
  on public.tournament_stages for insert
  to authenticated
  with check (
    exists (
      select 1 from public.tournaments
      where id = tournament_id and created_by = auth.uid()
    )
  );

create policy "Creator manages stages"
  on public.tournament_stages for update
  to authenticated
  using (
    exists (
      select 1 from public.tournaments
      where id = tournament_id and created_by = auth.uid()
    )
  );

create policy "Creator manages stages"
  on public.tournament_stages for delete
  to authenticated
  using (
    exists (
      select 1 from public.tournaments
      where id = tournament_id and created_by = auth.uid()
    )
  );

-- Matches and standings: no user write policies (service role only via admin client)
