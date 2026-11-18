-- PROPOSED ONLY: requires explicit approval before applying to any database.
begin;

create table if not exists public.admin_login_attempts (
  bucket_key text primary key check (bucket_key = 'global' or bucket_key ~ '^[a-f0-9]{64}$'),
  attempts integer not null check (attempts >= 0),
  expires_at timestamptz not null
);
create index if not exists admin_login_attempts_expiry_idx on public.admin_login_attempts (expires_at);
alter table public.admin_login_attempts enable row level security;
revoke all on table public.admin_login_attempts from public, anon, authenticated, service_role;

create or replace function public.consume_admin_login_attempt(p_client_key text)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql security definer set search_path = ''
set lock_timeout = '1s'
as $$
declare
  global_row public.admin_login_attempts%rowtype;
  client_row public.admin_login_attempts%rowtype;
  current_time_value timestamptz;
begin
  if p_client_key is null or p_client_key !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid client key';
  end if;

  -- Every invocation takes the same row lock first. This serializes reservations
  -- across instances and prevents both oversubscription and lock-order deadlocks.
  insert into public.admin_login_attempts values ('global', 0, clock_timestamp())
    on conflict (bucket_key) do nothing;
  select * into strict global_row from public.admin_login_attempts
    where bucket_key = 'global' for update;
  current_time_value := clock_timestamp();
  if global_row.expires_at <= current_time_value then
    global_row.attempts := 0;
    global_row.expires_at := current_time_value + interval '15 minutes';
  end if;
  if global_row.attempts >= 50 then
    return query select false, greatest(1, ceil(extract(epoch from (global_row.expires_at - current_time_value)))::integer);
    return;
  end if;

  -- Bounded cleanup under the global lock; never scan or log raw client IPs.
  delete from public.admin_login_attempts where bucket_key in (
    select bucket_key from public.admin_login_attempts
    where bucket_key <> 'global' and expires_at <= current_time_value
    order by expires_at limit 100
  );
  insert into public.admin_login_attempts values (p_client_key, 0, current_time_value + interval '15 minutes')
    on conflict (bucket_key) do nothing;
  select * into strict client_row from public.admin_login_attempts
    where bucket_key = p_client_key for update;
  if client_row.expires_at <= current_time_value then
    client_row.attempts := 0;
    client_row.expires_at := current_time_value + interval '15 minutes';
  end if;
  if client_row.attempts >= 5 then
    return query select false, greatest(1, ceil(extract(epoch from (client_row.expires_at - current_time_value)))::integer);
    return;
  end if;
  update public.admin_login_attempts set attempts = client_row.attempts + 1, expires_at = client_row.expires_at
    where bucket_key = p_client_key;
  update public.admin_login_attempts set attempts = global_row.attempts + 1, expires_at = global_row.expires_at
    where bucket_key = 'global';
  return query select true, 0;
end;
$$;
revoke all on function public.consume_admin_login_attempt(text) from public, anon, authenticated;
grant execute on function public.consume_admin_login_attempt(text) to service_role;

commit;
