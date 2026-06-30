-- =====================================================================
--  Version: 0002
--  Title:   Classes + Members schema
--  Step:    4 — Add Member / Classes management
--  Includes: code_word column, classes table, members table,
--            RLS, realtime, cascade delete, triggers
--  Run this in: Supabase Dashboard → SQL Editor → New query → Run
--  Note: idempotent (safe to re-run).
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 0) Add "code word" to settings (prefix for member codes, e.g. StMary)
-- ---------------------------------------------------------------------
alter table public.app_settings
  add column if not exists code_word text not null default 'StMary';

-- ---------------------------------------------------------------------
-- 1) classes : الفصول
-- ---------------------------------------------------------------------
create table if not exists public.classes (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,                 -- اسم الفصل (لو فاضي نستخدم المرحلة)
  patron        text,                          -- شفيع الفصل
  stage         text,                          -- مرحلة الفصل
  image_path    text,                          -- صورة الفصل (storage path)
  image_url     text,                          -- صورة الفصل (public url)
  service_days  text[] not null default '{}',  -- أيام الخدمة (أسماء الأيام)
  color_primary text not null default '#6d5dfc',
  color_accent  text not null default '#f15bb5',
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2) members : المخدومين
-- ---------------------------------------------------------------------
create table if not exists public.members (
  id              uuid primary key default gen_random_uuid(),
  code            text unique not null,        -- StMary + datetime ms
  -- الاسم الرباعي (4 خانات) + الاسم المجمّع
  name1           text not null default '',
  name2           text not null default '',
  name3           text not null default '',
  name4           text not null default '',
  full_name       text generated always as (
                    btrim(
                      coalesce(name1,'') || ' ' ||
                      coalesce(name2,'') || ' ' ||
                      coalesce(name3,'') || ' ' ||
                      coalesce(name4,'')
                    )
                  ) stored,
  phone           text,                         -- 11 رقم (بدون +2)؛ التحقق في الواجهة
  birth_day       int,                          -- يوم
  birth_month     int,                          -- شهر
  birth_year      int,                          -- سنة
  address         text,
  notes           text,
  photo_path      text,
  photo_url       text,
  opening_balance numeric(12,2) not null default 0,
  gender          text not null default 'male' check (gender in ('male','female')),
  class_id        uuid references public.classes(id) on delete set null,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_members_class_id on public.members(class_id);
create index if not exists idx_members_code on public.members(code);

-- ---------------------------------------------------------------------
-- 3) updated_at triggers (reuse function from 0001)
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_classes_updated on public.classes;
create trigger trg_classes_updated
  before update on public.classes
  for each row execute function public.set_updated_at();

drop trigger if exists trg_members_updated on public.members;
create trigger trg_members_updated
  before update on public.members
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 4) Row Level Security (authenticated full access for now; RBAC later)
-- ---------------------------------------------------------------------
alter table public.classes enable row level security;
alter table public.members enable row level security;

-- classes policies
drop policy if exists "classes_select" on public.classes;
create policy "classes_select" on public.classes
  for select to authenticated using (true);
drop policy if exists "classes_insert" on public.classes;
create policy "classes_insert" on public.classes
  for insert to authenticated with check (true);
drop policy if exists "classes_update" on public.classes;
create policy "classes_update" on public.classes
  for update to authenticated using (true) with check (true);
drop policy if exists "classes_delete" on public.classes;
create policy "classes_delete" on public.classes
  for delete to authenticated using (true);

-- members policies
drop policy if exists "members_select" on public.members;
create policy "members_select" on public.members
  for select to authenticated using (true);
drop policy if exists "members_insert" on public.members;
create policy "members_insert" on public.members
  for insert to authenticated with check (true);
drop policy if exists "members_update" on public.members;
create policy "members_update" on public.members
  for update to authenticated using (true) with check (true);
drop policy if exists "members_delete" on public.members;
create policy "members_delete" on public.members
  for delete to authenticated using (true);

-- ---------------------------------------------------------------------
-- 5) Realtime
-- ---------------------------------------------------------------------
alter table public.classes replica identity full;
alter table public.members replica identity full;
do $$
begin
  if not exists (select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='classes') then
    alter publication supabase_realtime add table public.classes;
  end if;
  if not exists (select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='members') then
    alter publication supabase_realtime add table public.members;
  end if;
end $$;
