-- leagues table
create table if not exists leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  budget_per_team numeric not null,
  created_by uuid references auth.users,
  created_at timestamptz default now()
);

-- participants table
create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  league_id uuid references leagues(id) on delete cascade,
  name text not null,
  color text,
  user_id uuid references auth.users
);

-- auction_results table
create table if not exists auction_results (
  id uuid primary key default gen_random_uuid(),
  league_id uuid references leagues(id) on delete cascade,
  participant_id uuid references participants(id),
  fpl_player_id integer not null,
  price_paid numeric not null,
  position_slot text check (position_slot in ('GKP', 'DEF', 'MID', 'FWD', 'BENCH')),
  created_at timestamptz default now()
);

-- team_formations table
create table if not exists team_formations (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid references participants(id) on delete cascade,
  formation text default '4-3-3',
  updated_at timestamptz default now()
);

-- Row Level Security
alter table leagues enable row level security;
alter table participants enable row level security;
alter table auction_results enable row level security;
alter table team_formations enable row level security;

-- RLS policies: allow all access (tighten per use-case)
create policy "leagues_select" on leagues for select using (true);
create policy "leagues_insert" on leagues for insert with check (auth.uid() = created_by);
create policy "leagues_update" on leagues for update using (auth.uid() = created_by);
create policy "leagues_delete" on leagues for delete using (auth.uid() = created_by);

create policy "participants_select" on participants for select using (true);
create policy "participants_insert" on participants for insert with check (
  exists (select 1 from leagues where id = league_id and created_by = auth.uid())
);
create policy "participants_update" on participants for update using (
  exists (select 1 from leagues where id = league_id and created_by = auth.uid())
);
create policy "participants_delete" on participants for delete using (
  exists (select 1 from leagues where id = league_id and created_by = auth.uid())
);

create policy "auction_results_select" on auction_results for select using (true);
create policy "auction_results_insert" on auction_results for insert with check (
  exists (select 1 from leagues where id = league_id and created_by = auth.uid())
);
create policy "auction_results_update" on auction_results for update using (
  exists (select 1 from leagues where id = league_id and created_by = auth.uid())
);
create policy "auction_results_delete" on auction_results for delete using (
  exists (select 1 from leagues where id = league_id and created_by = auth.uid())
);

create policy "team_formations_select" on team_formations for select using (true);
create policy "team_formations_insert" on team_formations for insert with check (
  exists (
    select 1 from participants p
    join leagues l on l.id = p.league_id
    where p.id = participant_id and l.created_by = auth.uid()
  )
);
create policy "team_formations_update" on team_formations for update using (
  exists (
    select 1 from participants p
    join leagues l on l.id = p.league_id
    where p.id = participant_id and l.created_by = auth.uid()
  )
);
