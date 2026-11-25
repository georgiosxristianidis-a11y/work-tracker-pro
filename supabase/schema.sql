-- Work Tracker Pro — work_entries with per-user isolation (RLS).
-- Run this in the Supabase SQL Editor.
--
-- PREREQUISITE: enable anonymous sign-ins:
--   Dashboard -> Authentication -> Sign In / Up -> Anonymous sign-ins: ON
--
-- MIGRATION NOTE: if an old `work_entries` table exists (keyed by date only,
-- no user_id), it is incompatible. Back up its rows first if you need them:
--   drop table if exists public.work_entries;

create table if not exists public.work_entries (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  date       date        not null,
  hours      numeric     not null,
  month      text        not null,
  device_id  text,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, date)
);

-- Idempotent migration for existing deployments (server-side soft-delete tombstones):
alter table public.work_entries add column if not exists deleted_at timestamptz;

alter table public.work_entries enable row level security;

-- Per-device session linking: each paired device keeps its own independent
-- anonymous auth.uid() session (zero shared refresh_token rotation conflicts).
create table if not exists public.device_links (
  member_uid uuid primary key references auth.users (id) on delete cascade,
  owner_uid  uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.device_links enable row level security;
revoke insert, update, delete on table public.device_links from public, anon, authenticated;

drop policy if exists "select own device links" on public.device_links;
create policy "select own device links" on public.device_links
  for select using (auth.uid() = member_uid or auth.uid() = owner_uid);

create table if not exists public.pairing_codes (
  code       text primary key,
  owner_uid  uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null
);

alter table public.pairing_codes enable row level security;
revoke all on table public.pairing_codes from public, anon, authenticated;

create or replace function public.create_pairing_code(p_code text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
begin
  if v_uid is null or p_code is null or length(p_code) < 8 or length(p_code) > 16 then
    raise exception 'invalid pairing request';
  end if;
  select dl.owner_uid into v_owner from public.device_links dl where dl.member_uid = v_uid;
  v_owner := coalesce(v_owner, v_uid);
  delete from public.pairing_codes where expires_at <= now() or owner_uid = v_owner;
  insert into public.pairing_codes (code, owner_uid, expires_at)
  values (upper(p_code), v_owner, now() + interval '10 minutes')
  on conflict (code) do nothing;
  if not found then
    raise exception 'pairing code already in use';
  end if;
  return v_owner;
end;
$$;

revoke all on function public.create_pairing_code(text) from public, anon, authenticated;
grant execute on function public.create_pairing_code(text) to authenticated, anon;

create or replace function public.claim_pairing_code(p_code text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
begin
  if v_uid is null or p_code is null then
    raise exception 'unauthenticated';
  end if;
  delete from public.pairing_codes
  where code = upper(p_code) and expires_at > now()
  returning owner_uid into v_owner;
  if v_owner is null then
    raise exception 'pairing code expired or invalid';
  end if;
  if v_owner <> v_uid then
    insert into public.device_links (member_uid, owner_uid)
    values (v_uid, v_owner)
    on conflict (member_uid) do update set owner_uid = excluded.owner_uid;
    update public.device_links set owner_uid = v_owner where owner_uid = v_uid;
  end if;
  return v_owner;
end;
$$;

revoke all on function public.claim_pairing_code(text) from public, anon, authenticated;
grant execute on function public.claim_pairing_code(text) to authenticated, anon;

drop policy if exists "select own entries" on public.work_entries;
create policy "select own entries" on public.work_entries
  for select using (
    auth.uid() = user_id
    or exists (select 1 from public.device_links dl where dl.member_uid = auth.uid() and dl.owner_uid = work_entries.user_id)
  );

drop policy if exists "insert own entries" on public.work_entries;
create policy "insert own entries" on public.work_entries
  for insert with check (
    auth.uid() = user_id
    or exists (select 1 from public.device_links dl where dl.member_uid = auth.uid() and dl.owner_uid = work_entries.user_id)
  );

drop policy if exists "update own entries" on public.work_entries;
create policy "update own entries" on public.work_entries
  for update using (
    auth.uid() = user_id
    or exists (select 1 from public.device_links dl where dl.member_uid = auth.uid() and dl.owner_uid = work_entries.user_id)
  ) with check (
    auth.uid() = user_id
    or exists (select 1 from public.device_links dl where dl.member_uid = auth.uid() and dl.owner_uid = work_entries.user_id)
  );

drop policy if exists "delete own entries" on public.work_entries;
create policy "delete own entries" on public.work_entries
  for delete using (
    auth.uid() = user_id
    or exists (select 1 from public.device_links dl where dl.member_uid = auth.uid() and dl.owner_uid = work_entries.user_id)
  );
