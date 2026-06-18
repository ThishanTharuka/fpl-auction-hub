-- Enable extensions
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Config table to store the CRON_SECRET (used by pg_cron to authenticate with Next.js)
create table if not exists public.app_config (
  key text primary key,
  value text not null
);
alter table public.app_config enable row level security;
create policy "Authenticated users can read app_config"
  on public.app_config for select to authenticated using (true);

-- Insert your CRON_SECRET here (must match the one in your Next.js .env.local / Vercel)
-- You can update it later via: upsert into public.app_config
insert into public.app_config (key, value)
values ('cron_secret', 'your-random-secret')
on conflict (key) do nothing;

-- Helper function to fetch config values (avoids subquery in cron SQL)
create or replace function public.get_config(key_name text) returns text
language sql stable security definer
as $$
  select value from public.app_config where key = key_name;
$$;

-- Schedule auto-scoring every 2 hours
-- Fetches the secret from app_config at runtime
-- To unschedule: select cron.unschedule('auto-score-tournaments');
select cron.schedule(
  'auto-score-tournaments',
  '0 */2 * * *',
  $$
    select net.http_post(
      url:='https://fpl-auction-hub.vercel.app/api/tournament/auto-score',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', concat('Bearer ', public.get_config('cron_secret'))
      )
    ) as request_id;
  $$
);
