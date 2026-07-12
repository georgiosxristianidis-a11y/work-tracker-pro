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
  primary key (user_id, date)
);

alter table public.work_entries enable row level security;

create policy "select own entries" on public.work_entries
  for select using (auth.uid() = user_id);

create policy "insert own entries" on public.work_entries
  for insert with check (auth.uid() = user_id);

create policy "update own entries" on public.work_entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "delete own entries" on public.work_entries
  for delete using (auth.uid() = user_id);
