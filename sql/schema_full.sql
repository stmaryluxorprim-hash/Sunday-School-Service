-- =====================================================================
--  schema_full.sql  —  Combined database build (from scratch → latest)
--  Up to version: 0005
--  ---------------------------------------------------------------------
--  Running this ONE file on an EMPTY Supabase project builds the whole
--  database to the latest version. It is fully idempotent (safe to
--  re-run). It is the union of all NNNN_*.sql migrations expressed as
--  their FINAL state (single-column name + birth_date, phone "+2…").
--
--  How to run: Supabase Dashboard → SQL Editor → New query → paste → Run.
--
--  Sections:
--    [0001] app_settings (identity) + storage bucket
--    [0002] classes + members (final single-column schema)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Shared trigger function (used by all updated_at triggers)
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

-- =====================================================================
--  [0001] app_settings — branding / identity (single row)
-- =====================================================================
create table if not exists public.app_settings (
  id             uuid primary key default gen_random_uuid(),
  service_name   text not null default 'خدمة الكنيسة',
  slogan         text not null default 'نخدم بمحبة ونعمل بإخلاص',
  color_primary  text not null default '#6d5dfc',
  color_accent   text not null default '#f15bb5',
  logo_path      text,
  logo_url       text,
  dark_mode      boolean not null default false,
  -- code word: prefix for member codes (added in 0002, kept here for full build)
  code_word      text not null default 'StMary',
  -- daily points cap (added in 0004): 0 = unlimited
  daily_points_max numeric(12,2) not null default 0,
  -- default points number (added in 0005): used by attendance / add / remove
  default_points numeric(12,2) not null default 1,
  updated_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- In case app_settings already existed without code_word / daily_points_max:
alter table public.app_settings
  add column if not exists code_word text not null default 'StMary';
alter table public.app_settings
  add column if not exists daily_points_max numeric(12,2) not null default 0;
alter table public.app_settings
  add column if not exists default_points numeric(12,2) not null default 1;

-- Seed exactly one settings row.
insert into public.app_settings (service_name)
select 'خدمة الكنيسة'
where not exists (select 1 from public.app_settings);

drop trigger if exists trg_app_settings_updated on public.app_settings;
create trigger trg_app_settings_updated
  before update on public.app_settings
  for each row execute function public.set_updated_at();

alter table public.app_settings enable row level security;

drop policy if exists "settings_select_auth" on public.app_settings;
create policy "settings_select_auth" on public.app_settings
  for select to authenticated using (true);

drop policy if exists "settings_update_auth" on public.app_settings;
create policy "settings_update_auth" on public.app_settings
  for update to authenticated using (true) with check (true);

drop policy if exists "settings_insert_auth" on public.app_settings;
create policy "settings_insert_auth" on public.app_settings
  for insert to authenticated with check (true);

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

-- Storage bucket for all app images (logos, avatars, etc.)
insert into storage.buckets (id, name, public)
values ('app-images', 'app-images', true)
on conflict (id) do nothing;

drop policy if exists "app_images_read" on storage.objects;
create policy "app_images_read" on storage.objects for select
  using (bucket_id = 'app-images');

drop policy if exists "app_images_insert" on storage.objects;
create policy "app_images_insert" on storage.objects for insert
  to authenticated with check (bucket_id = 'app-images');

drop policy if exists "app_images_update" on storage.objects;
create policy "app_images_update" on storage.objects for update
  to authenticated using (bucket_id = 'app-images') with check (bucket_id = 'app-images');

drop policy if exists "app_images_delete" on storage.objects;
create policy "app_images_delete" on storage.objects for delete
  to authenticated using (bucket_id = 'app-images');

-- =====================================================================
--  [0002 + 0003] classes + members (FINAL single-column schema)
-- =====================================================================

-- classes : الفصول
create table if not exists public.classes (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  patron        text,
  stage         text,
  image_path    text,
  image_url     text,
  service_days  text[] not null default '{}',
  color_primary text not null default '#6d5dfc',
  color_accent  text not null default '#f15bb5',
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- members : المخدومين (الاسم في خانة واحدة + birth_date + phone بصيغة +2)
create table if not exists public.members (
  id              uuid primary key default gen_random_uuid(),
  code            text unique not null,
  name            text not null,
  phone           text,                         -- +2 + 11 digits (e.g. +201273447740)
  birth_date      date,
  address         text,
  notes           text,
  photo_path      text,
  photo_url       text,
  opening_balance numeric(12,2) not null default 0,
  attendance_count integer not null default 0,  -- (0004) إجمالي عدد مرات الحضور
  gender          text not null default 'male' check (gender in ('male','female')),
  class_id        uuid references public.classes(id) on delete set null,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- (0004) ensure attendance_count exists if members predates this build
alter table public.members
  add column if not exists attendance_count integer not null default 0;

create index if not exists idx_members_class_id on public.members(class_id);
create index if not exists idx_members_code on public.members(code);

drop trigger if exists trg_classes_updated on public.classes;
create trigger trg_classes_updated
  before update on public.classes
  for each row execute function public.set_updated_at();

drop trigger if exists trg_members_updated on public.members;
create trigger trg_members_updated
  before update on public.members
  for each row execute function public.set_updated_at();

alter table public.classes enable row level security;
alter table public.members enable row level security;

drop policy if exists "classes_select" on public.classes;
create policy "classes_select" on public.classes for select to authenticated using (true);
drop policy if exists "classes_insert" on public.classes;
create policy "classes_insert" on public.classes for insert to authenticated with check (true);
drop policy if exists "classes_update" on public.classes;
create policy "classes_update" on public.classes for update to authenticated using (true) with check (true);
drop policy if exists "classes_delete" on public.classes;
create policy "classes_delete" on public.classes for delete to authenticated using (true);

drop policy if exists "members_select" on public.members;
create policy "members_select" on public.members for select to authenticated using (true);
drop policy if exists "members_insert" on public.members;
create policy "members_insert" on public.members for insert to authenticated with check (true);
drop policy if exists "members_update" on public.members;
create policy "members_update" on public.members for update to authenticated using (true) with check (true);
drop policy if exists "members_delete" on public.members;
create policy "members_delete" on public.members for delete to authenticated using (true);

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

-- =====================================================================
--  [0004] attendance_log + balance_log + atomic RPCs
-- =====================================================================

-- attendance_log : سجل عمليات الحضور (حضور واحد لكل مخدوم في اليوم)
create table if not exists public.attendance_log (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.members(id) on delete cascade,
  attended_on date not null,
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id) on delete set null,
  unique (member_id, attended_on)
);
create index if not exists idx_attendance_member on public.attendance_log(member_id);
create index if not exists idx_attendance_date   on public.attendance_log(attended_on);

-- balance_log : سجل عمليات النقاط (إضافة/خصم)
create table if not exists public.balance_log (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.members(id) on delete cascade,
  amount      numeric(12,2) not null,
  reason      text,
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id) on delete set null
);
create index if not exists idx_balance_member on public.balance_log(member_id);
create index if not exists idx_balance_date   on public.balance_log(created_at);

alter table public.attendance_log enable row level security;
alter table public.balance_log    enable row level security;

drop policy if exists "attendance_select" on public.attendance_log;
create policy "attendance_select" on public.attendance_log for select to authenticated using (true);
drop policy if exists "attendance_insert" on public.attendance_log;
create policy "attendance_insert" on public.attendance_log for insert to authenticated with check (true);
drop policy if exists "attendance_delete" on public.attendance_log;
create policy "attendance_delete" on public.attendance_log for delete to authenticated using (true);

drop policy if exists "balance_select" on public.balance_log;
create policy "balance_select" on public.balance_log for select to authenticated using (true);
drop policy if exists "balance_insert" on public.balance_log;
create policy "balance_insert" on public.balance_log for insert to authenticated with check (true);

alter table public.attendance_log replica identity full;
alter table public.balance_log    replica identity full;
do $$
begin
  if not exists (select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='attendance_log') then
    alter publication supabase_realtime add table public.attendance_log;
  end if;
  if not exists (select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='balance_log') then
    alter publication supabase_realtime add table public.balance_log;
  end if;
end $$;

-- RPC: mark_attendance — تسجيل حضور + إضافة نقاط (ذرّي، يمنع التكرار)
create or replace function public.mark_attendance(p_member_id uuid, p_date date, p_points numeric default 0)
returns public.members language plpgsql security invoker as $$
declare v_inserted boolean := false; v_row public.members;
begin
  insert into public.attendance_log (member_id, attended_on, created_by)
  values (p_member_id, p_date, auth.uid())
  on conflict (member_id, attended_on) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted then
    update public.members
      set attendance_count = attendance_count + 1,
          opening_balance  = opening_balance + coalesce(p_points, 0)
      where id = p_member_id returning * into v_row;
    if coalesce(p_points, 0) <> 0 then
      insert into public.balance_log (member_id, amount, reason, created_by)
      values (p_member_id, p_points, 'حضور', auth.uid());
    end if;
  else
    select * into v_row from public.members where id = p_member_id;
  end if;
  return v_row;
end; $$;

-- RPC: unmark_attendance — إلغاء حضور اليوم + خصم النقاط (ذرّي)
create or replace function public.unmark_attendance(p_member_id uuid, p_date date, p_points numeric default 0)
returns public.members language plpgsql security invoker as $$
declare v_deleted boolean := false; v_row public.members;
begin
  delete from public.attendance_log where member_id = p_member_id and attended_on = p_date;
  get diagnostics v_deleted = row_count;
  if v_deleted then
    update public.members
      set attendance_count = greatest(attendance_count - 1, 0),
          opening_balance  = opening_balance - coalesce(p_points, 0)
      where id = p_member_id returning * into v_row;
    if coalesce(p_points, 0) <> 0 then
      insert into public.balance_log (member_id, amount, reason, created_by)
      values (p_member_id, -p_points, 'إلغاء حضور', auth.uid());
    end if;
  else
    select * into v_row from public.members where id = p_member_id;
  end if;
  return v_row;
end; $$;

-- RPC: adjust_balance — إضافة/خصم نقاط (ذرّي) + حد أقصى يومي
create or replace function public.adjust_balance(
  p_member_id uuid, p_amount numeric, p_reason text, p_date date)
returns public.members language plpgsql security invoker as $$
declare v_max numeric; v_today_pos numeric; v_row public.members;
begin
  if p_amount is null or p_amount = 0 then raise exception 'amount_zero'; end if;
  if p_amount > 0 then
    select coalesce(daily_points_max, 0) into v_max from public.app_settings limit 1;
    if coalesce(v_max, 0) > 0 then
      select coalesce(sum(amount), 0) into v_today_pos from public.balance_log
        where member_id = p_member_id and amount > 0
          and (created_at at time zone 'UTC')::date = p_date;
      if v_today_pos + p_amount > v_max then
        raise exception 'daily_limit_exceeded:%:%', v_max, v_today_pos;
      end if;
    end if;
  end if;
  insert into public.balance_log (member_id, amount, reason, created_by)
  values (p_member_id, p_amount, nullif(btrim(coalesce(p_reason,'')), ''), auth.uid());
  update public.members set opening_balance = opening_balance + p_amount
    where id = p_member_id returning * into v_row;
  return v_row;
end; $$;

-- Done. Database is at version 0005.
