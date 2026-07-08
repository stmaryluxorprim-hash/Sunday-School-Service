-- =====================================================================
--  Version: 0012
--  Title:   Member Portal — Achievements + Events RPCs
--  Step:    ربط صفحة المخدوم بالإنجازات والإعلانات/الفعاليات (نفس جداول الخادم)
--  Run this in: Supabase Dashboard → SQL Editor → New query → Run
--  Note: idempotent (safe to re-run).
--  ---------------------------------------------------------------------
--  Adds (all keyed by the member's secret card code p_code):
--    * member_portal_achievements : كل الإنجازات المعرَّفة + حالة حصول
--      المخدوم عليها وتاريخ المنح (يظهر فوراً ما يمنحه الخادم).
--    * member_portal_events       : الإعلانات والفعاليات المنشورة من
--      صفحة الخادم — تظهر مباشرة في بوابة المخدوم.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) member_portal_achievements — إنجازات المخدوم + كل التعريفات
-- ---------------------------------------------------------------------
create or replace function public.member_portal_achievements(p_code text)
returns table (
  id uuid, name text, description text, icon text, color text,
  points integer, earned boolean, awarded_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.members;
begin
  v := public._member_from_code(p_code);
  return query
    select a.id, a.name, a.description, a.icon, a.color, a.points,
           (ma.id is not null) as earned,
           ma.awarded_at
    from public.achievements a
    left join public.member_achievements ma
      on ma.achievement_id = a.id and ma.member_id = v.id
    order by (ma.id is not null) desc, ma.awarded_at desc nulls last, a.created_at desc;
end;
$$;

-- ---------------------------------------------------------------------
-- 2) member_portal_events — الإعلانات والفعاليات (الأحدث أولاً)
-- ---------------------------------------------------------------------
create or replace function public.member_portal_events(p_code text)
returns table (
  id uuid, title text, description text, kind text,
  event_date date, event_time text, location text, created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.members;
begin
  v := public._member_from_code(p_code);
  return query
    select e.id, e.title, e.description, e.kind,
           e.event_date, e.event_time, e.location, e.created_at
    from public.events e
    order by e.created_at desc
    limit 200;
end;
$$;

-- ---------------------------------------------------------------------
-- 3) Grants — البوابة تعمل بمفتاح anon (بدون جلسة auth)
-- ---------------------------------------------------------------------
grant execute on function public.member_portal_achievements(text) to anon, authenticated;
grant execute on function public.member_portal_events(text)       to anon, authenticated;

-- Done. Database is at version 0012.
