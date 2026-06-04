create or replace function get_server_time()
returns timestamptz
language sql
stable
as $$
  select now();
$$;
