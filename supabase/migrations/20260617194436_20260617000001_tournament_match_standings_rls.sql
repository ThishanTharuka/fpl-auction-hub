-- RLS: tournament creator can manage tournaments
drop policy if exists "manage tournaments" on tournaments;
create policy "manage tournaments" on tournaments
  for all using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- RLS: tournament creator can manage stages
drop policy if exists "manage stages" on tournament_stages;
create policy "manage stages" on tournament_stages
  for all using (
    exists (select 1 from tournaments where tournaments.id = tournament_stages.tournament_id and tournaments.created_by = auth.uid())
  )
  with check (
    exists (select 1 from tournaments where tournaments.id = tournament_stages.tournament_id and tournaments.created_by = auth.uid())
  );

-- RLS: tournament creator inserts matches
drop policy if exists "Creator inserts matches" on tournament_matches;
create policy "Creator inserts matches" on tournament_matches
  for insert with check (
    exists (
      select 1 from tournament_stages ts
      join tournaments t on t.id = ts.tournament_id
      where ts.id = tournament_matches.stage_id and t.created_by = auth.uid()
    )
  );

-- RLS: tournament creator updates matches
drop policy if exists "Creator updates matches" on tournament_matches;
create policy "Creator updates matches" on tournament_matches
  for update using (
    exists (
      select 1 from tournament_stages ts
      join tournaments t on t.id = ts.tournament_id
      where ts.id = tournament_matches.stage_id and t.created_by = auth.uid()
    )
  );

-- RLS: tournament creator inserts standings
drop policy if exists "Creator inserts standings" on tournament_standings;
create policy "Creator inserts standings" on tournament_standings
  for insert with check (
    exists (
      select 1 from tournament_stages ts
      join tournaments t on t.id = ts.tournament_id
      where ts.id = tournament_standings.stage_id and t.created_by = auth.uid()
    )
  );

-- RLS: tournament creator updates standings
drop policy if exists "Creator updates standings" on tournament_standings;
create policy "Creator updates standings" on tournament_standings
  for update using (
    exists (
      select 1 from tournament_stages ts
      join tournaments t on t.id = ts.tournament_id
      where ts.id = tournament_standings.stage_id and t.created_by = auth.uid()
    )
  );
