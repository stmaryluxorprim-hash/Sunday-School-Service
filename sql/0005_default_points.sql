-- =====================================================================
--  Version: 0005
--  Title:   Default points number — settings value + attendance applies points
--  Run this in: Supabase Dashboard → SQL Editor → New query → Run
--  Note: fully idempotent & safe to re-run.
--  ---------------------------------------------------------------------
--  Adds:
--    • app_settings.default_points  (عدد النقاط الافتراضي بجانب "الوظيفة")
--      يُستخدم كقيمة مبدئية لكل العمليات: الحضور / إضافة نقاط / خصم نقاط.
--  Updates:
--    • mark_attendance(p_member_id, p_date, p_points)  — يسجّل الحضور
--      ويضيف p_points للرصيد (مرة واحدة فقط لكل يوم) ويكتب سطراً في balance_log.
--    • unmark_attendance(p_member_id, p_date, p_points) — يلغي حضور اليوم
--      ويخصم p_points من الرصيد (مرة واحدة فقط) ويكتب سطراً في balance_log.
--  ملاحظة: الإصدارات القديمة بدون p_points تبقى متاحة عبر قيمة افتراضية = 0
--          حتى لا ينكسر أي استدعاء قديم.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) إعداد النقاط الافتراضية
-- ---------------------------------------------------------------------
alter table public.app_settings
  add column if not exists default_points numeric(12,2) not null default 1;
-- default_points = العدد المبدئي الظاهر بجانب "الوظيفة" في صفحة البيانات.

-- ---------------------------------------------------------------------
-- 2) mark_attendance — تسجيل حضور + إضافة نقاط (ذرّي، يمنع التكرار)
--    p_points: عدد النقاط التي تُضاف للرصيد عند تسجيل الحضور (0 = بدون نقاط).
--    تُضاف النقاط مرة واحدة فقط في اليوم (مع أول تسجيل حضور لذلك اليوم).
-- ---------------------------------------------------------------------
create or replace function public.mark_attendance(
  p_member_id uuid,
  p_date      date,
  p_points    numeric default 0
)
returns public.members
language plpgsql
security invoker
as $$
declare
  v_inserted boolean := false;
  v_row      public.members;
begin
  insert into public.attendance_log (member_id, attended_on, created_by)
  values (p_member_id, p_date, auth.uid())
  on conflict (member_id, attended_on) do nothing;

  get diagnostics v_inserted = row_count;  -- 1 = أُدرج، 0 = موجود مسبقاً

  if v_inserted then
    update public.members
      set attendance_count = attendance_count + 1,
          opening_balance  = opening_balance + coalesce(p_points, 0)
      where id = p_member_id
      returning * into v_row;

    -- سجّل النقاط المضافة بسبب الحضور (إن وُجدت)
    if coalesce(p_points, 0) <> 0 then
      insert into public.balance_log (member_id, amount, reason, created_by)
      values (p_member_id, p_points, 'حضور', auth.uid());
    end if;
  else
    select * into v_row from public.members where id = p_member_id;
  end if;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------
-- 3) unmark_attendance — إلغاء حضور اليوم + خصم النقاط (ذرّي)
--    p_points: عدد النقاط التي تُخصم من الرصيد عند إلغاء الحضور (0 = بدون).
--    تُخصم مرة واحدة فقط إن كان هناك حضور مسجّل لذلك اليوم.
-- ---------------------------------------------------------------------
create or replace function public.unmark_attendance(
  p_member_id uuid,
  p_date      date,
  p_points    numeric default 0
)
returns public.members
language plpgsql
security invoker
as $$
declare
  v_deleted boolean := false;
  v_row     public.members;
begin
  delete from public.attendance_log
    where member_id = p_member_id and attended_on = p_date;

  get diagnostics v_deleted = row_count;

  if v_deleted then
    update public.members
      set attendance_count = greatest(attendance_count - 1, 0),
          opening_balance  = opening_balance - coalesce(p_points, 0)
      where id = p_member_id
      returning * into v_row;

    -- سجّل خصم النقاط بسبب إلغاء الحضور (إن وُجد)
    if coalesce(p_points, 0) <> 0 then
      insert into public.balance_log (member_id, amount, reason, created_by)
      values (p_member_id, -p_points, 'إلغاء حضور', auth.uid());
    end if;
  else
    select * into v_row from public.members where id = p_member_id;
  end if;

  return v_row;
end;
$$;

-- Done. Database is at version 0005.
