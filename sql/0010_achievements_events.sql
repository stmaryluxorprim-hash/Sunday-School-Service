-- =====================================================================
--  0010_achievements_events.sql  —  Achievements + Announcements/Events
--  ---------------------------------------------------------------------
--  Adds:
--    * achievements        : تعريف الإنجازات (اسم/أيقونة/لون/نقاط)
--    * member_achievements : منح إنجاز لمخدوم (مع تاريخ ومانح)
--    * events              : الإعلانات والفعاليات (عنوان/وصف/تاريخ/نوع)
--
--  Idempotent (safe to re-run). Run in Supabase → SQL Editor.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- achievements : تعريفات الإنجازات
-- ---------------------------------------------------------------------
create table if not exists public.achievements (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,                      -- اسم الإنجاز
  description text,                               -- وصف مختصر
  icon        text not null default 'trophy',     -- اسم أيقونة lucide
  color       text not null default '#f59e0b',    -- لون مميّز
  points      integer not null default 0,         -- نقاط تُضاف للرصيد عند المنح
  created_at  timestamptz not null default now()
);
create index if not exists idx_achievements_created on public.achievements(created_at desc);

-- ---------------------------------------------------------------------
-- member_achievements : منح إنجاز لمخدوم
-- ---------------------------------------------------------------------
create table if not exists public.member_achievements (
  id             uuid primary key default gen_random_uuid(),
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  member_id      uuid not null references public.members(id) on delete cascade,
  awarded_by     uuid references auth.users(id) on delete set null,
  awarded_at     timestamptz not null default now(),
  unique (achievement_id, member_id)
);
create index if not exists idx_member_ach_member on public.member_achievements(member_id);
create index if not exists idx_member_ach_ach on public.member_achievements(achievement_id);

-- ---------------------------------------------------------------------
-- events : الإعلانات والفعاليات
-- ---------------------------------------------------------------------
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,                          -- العنوان
  description text,                                   -- التفاصيل
  kind        text not null default 'event',          -- 'event' فعالية | 'announcement' إعلان
  event_date  date,                                   -- تاريخ الفعالية (اختياري للإعلان)
  event_time  text,                                   -- وقت الفعالية (نص حر)
  location    text,                                   -- المكان
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_events_date on public.events(event_date desc);
create index if not exists idx_events_created on public.events(created_at desc);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.achievements        enable row level security;
alter table public.member_achievements enable row level security;
alter table public.events              enable row level security;

-- achievements
drop policy if exists "achievements_select" on public.achievements;
create policy "achievements_select" on public.achievements
  for select to authenticated using (true);
drop policy if exists "achievements_insert" on public.achievements;
create policy "achievements_insert" on public.achievements
  for insert to authenticated with check (true);
drop policy if exists "achievements_update" on public.achievements;
create policy "achievements_update" on public.achievements
  for update to authenticated using (true);
drop policy if exists "achievements_delete" on public.achievements;
create policy "achievements_delete" on public.achievements
  for delete to authenticated using (true);

-- member_achievements
drop policy if exists "member_achievements_select" on public.member_achievements;
create policy "member_achievements_select" on public.member_achievements
  for select to authenticated using (true);
drop policy if exists "member_achievements_insert" on public.member_achievements;
create policy "member_achievements_insert" on public.member_achievements
  for insert to authenticated with check (true);
drop policy if exists "member_achievements_delete" on public.member_achievements;
create policy "member_achievements_delete" on public.member_achievements
  for delete to authenticated using (true);

-- events
drop policy if exists "events_select" on public.events;
create policy "events_select" on public.events
  for select to authenticated using (true);
drop policy if exists "events_insert" on public.events;
create policy "events_insert" on public.events
  for insert to authenticated with check (true);
drop policy if exists "events_update" on public.events;
create policy "events_update" on public.events
  for update to authenticated using (true);
drop policy if exists "events_delete" on public.events;
create policy "events_delete" on public.events
  for delete to authenticated using (true);
