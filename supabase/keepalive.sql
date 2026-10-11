-- Work Tracker Pro: Keep-alive heartbeat for Supabase Free Tier.
--
-- WHAT IT DOES: A 1-row table and public.keepalive_ping() function that writes
-- pinged_at = now() and returns the recorded timestamp. Called twice daily
-- by .github/workflows/supabase-keepalive.yml (POST /rest/v1/rpc/keepalive_ping).
--
-- WHY WRITE INSTEAD OF READ:
-- Supabase pauses free-tier projects if they receive no database activity in 7 days.
-- Passive SELECT requests under anon are often filtered by RLS and do not register
-- as active database usage. A volatile UPDATE/INSERT transaction guarantees actual
-- write activity on Postgres, preventing automatic pause.
--
-- SECURITY:
--   - No parameters (no injection vector).
--   - Only touches id = 1 of keepalive_heartbeat.
--   - search_path = '' prevents schema hijacking.
--   - RLS enabled on table, direct REST access denied. Only the RPC function can write.
--
-- HOW TO APPLY:
--   Supabase Dashboard -> SQL Editor -> New Query -> Paste this file -> Run.

create table if not exists public.keepalive_heartbeat (
  id smallint primary key default 1 check (id = 1),
  pinged_at timestamptz not null default now()
);

alter table public.keepalive_heartbeat enable row level security;
revoke all on table public.keepalive_heartbeat from public, anon, authenticated;

insert into public.keepalive_heartbeat (id) values (1) on conflict (id) do nothing;

create or replace function public.keepalive_ping()
returns timestamptz
language sql
volatile
security definer
set search_path = ''
as $$
  insert into public.keepalive_heartbeat (id, pinged_at)
  values (1, now())
  on conflict (id) do update set pinged_at = excluded.pinged_at
  returning pinged_at;
$$;

revoke all on function public.keepalive_ping() from public, anon, authenticated, service_role;
grant execute on function public.keepalive_ping() to anon;

notify pgrst, 'reload schema';
