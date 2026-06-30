-- =====================================================================
--  Version: 0001
--  Title:   App Settings (Identity) schema
--  Step:    3 — Settings / Identity
--  Includes: table, RLS, realtime, storage bucket + policies, triggers
--  Run this in: Supabase Dashboard → SQL Editor → New query → Run
--  Note: safe to re-run (idempotent: IF NOT EXISTS / drop-create policies).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Extensions
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 2) app_settings : single-row-per-org configuration
--    For now the app is single-tenant, so we keep one row identified by
--    a fixed key. Designed to extend to multi-org later.
-- ---------------------------------------------------------------------
create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  -- branding / identity
  service_name   text not null default 'خدمة الكنيسة',
  slogan         text not null default 'نخدم بمحبة ونعمل بإخلاص',
  -- gradient colors (hex strings, e.g. #6d5dfc)
  color_primary  text not null default '#6d5dfc',
  color_accent   text not null default '#f15bb5',
  -- logo stored in Supabase Storage (public path)
  logo_path      text,
  logo_url       text,
  dark_mode      boolean not null default false,
  -- bookkeeping
  updated_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Ensure exactly one settings row exists (seed).
insert into public.app_settings (service_name)
select 'خدمة الكنيسة'
where not exists (select 1 from public.app_settings);

-- ---------------------------------------------------------------------
-- 3) updated_at trigger
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_app_settings_updated on public.app_settings;
create trigger trg_app_settings_updated
  before update on public.app_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 4) Row Level Security
--    - Any authenticated user can read settings.
--    - Any authenticated user can update settings (RBAC will refine this
--      in a later step via a permission check).
-- ---------------------------------------------------------------------
alter table public.app_settings enable row level security;

drop policy if exists "settings_select_auth" on public.app_settings;
create policy "settings_select_auth"
  on public.app_settings
  for select
  to authenticated
  using (true);

drop policy if exists "settings_update_auth" on public.app_settings;
create policy "settings_update_auth"
  on public.app_settings
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "settings_insert_auth" on public.app_settings;
create policy "settings_insert_auth"
  on public.app_settings
  for insert
  to authenticated
  with check (true);

-- ---------------------------------------------------------------------
-- 5) Realtime — broadcast changes to subscribed clients
-- ---------------------------------------------------------------------
alter table public.app_settings replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'app_settings'
  ) then
    alter publication supabase_realtime add table public.app_settings;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 6) Storage bucket for all app images (logos, avatars, etc.)
--    Public read; authenticated write/update/delete.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('app-images', 'app-images', true)
on conflict (id) do nothing;

drop policy if exists "app_images_read" on storage.objects;
create policy "app_images_read"
  on storage.objects for select
  using (bucket_id = 'app-images');

drop policy if exists "app_images_insert" on storage.objects;
create policy "app_images_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'app-images');

drop policy if exists "app_images_update" on storage.objects;
create policy "app_images_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'app-images')
  with check (bucket_id = 'app-images');

drop policy if exists "app_images_delete" on storage.objects;
create policy "app_images_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'app-images');
