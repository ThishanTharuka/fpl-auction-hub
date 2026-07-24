-- Add avatar and FPL connection columns to participants
alter table public.participants
  add column if not exists avatar_url text,
  add column if not exists fpl_manager_id bigint;

-- Create public storage bucket for team avatars (if not exists)
insert into storage.buckets (id, name, public)
select 'team-avatars', 'team-avatars', true
where not exists (select 1 from storage.buckets where id = 'team-avatars');

-- Allow anyone to read avatars
do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'Public read' and tablename = 'objects' and schemaname = 'storage'
  ) then
    create policy "Public read"
      on storage.objects for select
      using (bucket_id = 'team-avatars');
  end if;
end $$;

-- Allow authenticated users to upload
do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'Team managers upload' and tablename = 'objects' and schemaname = 'storage'
  ) then
    create policy "Team managers upload"
      on storage.objects for insert
      with check (
        bucket_id = 'team-avatars'
        and auth.role() = 'authenticated'
      );
  end if;
end $$;

-- Allow authenticated users to update own uploads
do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'Team managers update' and tablename = 'objects' and schemaname = 'storage'
  ) then
    create policy "Team managers update"
      on storage.objects for update
      using (bucket_id = 'team-avatars' and auth.role() = 'authenticated');
  end if;
end $$;
