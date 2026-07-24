-- Create tournament enums
do $$ begin
  create type stage_type as enum ('league', 'round_robin', 'swiss', 'knockout');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type tournament_status as enum ('draft', 'active', 'completed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type match_status as enum ('scheduled', 'completed', 'bye');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type round_label as enum ('league', 'swiss', 'r32', 'r16', 'qf', 'sf', 'third_place', 'final');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type scoring_mode as enum ('total_points', 'head_to_head');
exception when duplicate_object then null;
end $$;

-- Tournaments table
create table if not exists tournaments (
  id uuid primary key default gen_random_uuid(),
  league_id uuid references leagues(id) on delete cascade not null,
  name text not null,
  start_gw integer not null default 1,
  end_gw integer not null default 38,
  status tournament_status not null default 'draft',
  created_by uuid,
  created_at timestamptz default now()
);

-- Tournament stages
create table if not exists tournament_stages (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references tournaments(id) on delete cascade not null,
  name text not null,
  stage_order integer not null,
  type stage_type not null,
  scoring_mode scoring_mode not null default 'total_points',
  start_gw integer not null,
  end_gw integer not null,
  advance_qualifiers integer,
  config jsonb not null default '{}',
  status tournament_status not null default 'draft',
  created_at timestamptz default now(),
  unique (tournament_id, stage_order)
);

-- Tournament matches
create table if not exists tournament_matches (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid references tournament_stages(id) on delete cascade not null,
  gw integer not null,
  round_number integer not null,
  round_label round_label not null default 'league',
  home_team_id uuid references participants(id),
  away_team_id uuid references participants(id),
  home_fpl_pts integer,
  away_fpl_pts integer,
  winner_team_id uuid references participants(id),
  status match_status not null default 'scheduled',
  created_at timestamptz default now()
);

-- Tournament standings
create table if not exists tournament_standings (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid references tournament_stages(id) on delete cascade not null,
  team_id uuid references participants(id) not null,
  played integer default 0,
  won integer default 0,
  drawn integer default 0,
  lost integer default 0,
  fpl_pts_for integer default 0,
  fpl_pts_against integer default 0,
  fpl_pts_diff integer,
  match_points integer default 0,
  position integer,
  unique (stage_id, team_id)
);

-- Indexes
create index if not exists idx_tournaments_league on tournaments(league_id);
create index if not exists idx_tournament_stages_tournament on tournament_stages(tournament_id);
create index if not exists idx_tournament_matches_stage on tournament_matches(stage_id);
create index if not exists idx_tournament_matches_gw on tournament_matches(gw);
create index if not exists idx_tournament_standings_stage on tournament_standings(stage_id);
create index if not exists idx_tournament_standings_position on tournament_standings(stage_id, position);

-- Enable RLS
alter table tournaments enable row level security;
alter table tournament_stages enable row level security;
alter table tournament_matches enable row level security;
alter table tournament_standings enable row level security;

-- RLS: read all (authenticated users can see tournaments in their leagues)
drop policy if exists "read tournaments" on tournaments;
create policy "read tournaments" on tournaments
  for select using (true);

drop policy if exists "read stages" on tournament_stages;
create policy "read stages" on tournament_stages
  for select using (true);

drop policy if exists "read matches" on tournament_matches;
create policy "read matches" on tournament_matches
  for select using (true);

drop policy if exists "read standings" on tournament_standings;
create policy "read standings" on tournament_standings
  for select using (true);
