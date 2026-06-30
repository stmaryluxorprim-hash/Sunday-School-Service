-- =====================================================================
--  Version: 0004
--  Title:   Attendance & Points — logs + totals + atomic RPCs
--  Run this in: Supabase Dashboard → SQL Editor → New query → Run
--  Note: fully idempotent & safe to re-run.
--  ---------------------------------------------------------------------
--  Adds:
--    • members.attendance_count   (إجمالي عدد مرات الحضور)
--    • app_settings.daily_points_max (الحد الأقصى لإضافة النقاط في اليوم)
--    • attendance_log  (سجل عمليات الحضور: تاريخ اليوم + وقت التسجيل + الخادم)
--    • balance_log     (سجل عمليات النقاط: المبلغ + السبب + الوقت + الخادم)
--    • RPCs: mark_attendance / unmark_attendance / adjust_balance
--  الرصيد الجاري يُخزَّن في members.opening_balance (يُعدَّل مع كل عملية نقاط).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) أعمدة الإجماليات + إعداد الحد الأقصى للنقاط
-- ---------------------------------------------------------------------
alter table public.members
  add column if not exists attendance_count integer not null default 0;

alter table public.app_settings
  add column if not exists daily_points_max numeric(12,2) not null default 0;
-- daily_points_max = 0 يعني "لا يوجد حد" (غير محدود).

-- ---------------------------------------------------------------------
-- 2) attendance_log — سجل عمليات الحضور
--    حضور واحد لكل مخدوم في اليوم (unique على member_id + attended_on)
-- ---------------------------------------------------------------------
create table if not exists public.attendance_log (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.members(id) on delete cascade,
  attended_on date not null,                 -- التاريخ المختار من الهيدر
  created_at  timestamptz not null default now(), -- وقت تسجيل العملية فعلياً
  created_by  uuid references auth.users(id) on delete set null,
  unique (member_id, attended_on)
);

create index if not exists idx_attendance_member on public.attendance_log(member_id);
create index if not exists idx_attendance_date   on public.attendance_log(attended_on);

-- ---------------------------------------------------------------------
-- 3) balance_log — سجل عمليات النقاط (إضافة/خصم)
-- ---------------------------------------------------------------------
create table if not exists public.balance_log (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.members(id) on delete cascade,
  amount      numeric(12,2) not null,        -- موجب = إضافة، سالب = خصم
  reason      text,                          -- سبب العملية
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id) on delete set null
);

create index if not exists idx_balance_member on public.balance_log(member_id);
create index if not exists idx_balance_date   on public.balance_log(created_at);

-- ---------------------------------------------------------------------
-- 4) RLS — مقروء/مكتوب للمستخدمين المسجّلين
-- ---------------------------------------------------------------------
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

-- realtime
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

-- ---------------------------------------------------------------------
-- 5) RPC: mark_attendance — تسجيل حضور (ذرّي، يمنع التكرار)
--    يضيف صفاً في السجل ويزيد attendance_count مرة واحدة فقط لليوم.
-- ---------------------------------------------------------------------
create or replace function public.mark_attendance(
  p_member_id uuid,
  p_date      date
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
      set attendance_count = attendance_count + 1
      where id = p_member_id
      returning * into v_row;
  else
    select * into v_row from public.members where id = p_member_id;
  end if;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------
-- 6) RPC: unmark_attendance — إلغاء حضور اليوم (ذرّي)
--    يحذف صف اليوم وينقص attendance_count إن وُجد.
-- ---------------------------------------------------------------------
create or replace function public.unmark_attendance(
  p_member_id uuid,
  p_date      date
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
      set attendance_count = greatest(attendance_count - 1, 0)
      where id = p_member_id
      returning * into v_row;
  else
    select * into v_row from public.members where id = p_member_id;
  end if;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------
-- 7) RPC: adjust_balance — إضافة/خصم نقاط (ذرّي)
--    p_amount موجب = إضافة، سالب = خصم.
--    يطبّق حد أقصى يومي على إجمالي الإضافات الموجبة (daily_points_max).
--    p_date = اليوم المختار من الهيدر (لحساب حدّ اليوم).
-- ---------------------------------------------------------------------
create or replace function public.adjust_balance(
  p_member_id uuid,
  p_amount    numeric,
  p_reason    text,
  p_date      date
)
returns public.members
language plpgsql
security invoker
as $$
declare
  v_max        numeric;
  v_today_pos  numeric;
  v_row        public.members;
begin
  if p_amount is null or p_amount = 0 then
    raise exception 'amount_zero';
  end if;

  -- فحص الحد الأقصى اليومي — فقط على الإضافات الموجبة
  if p_amount > 0 then
    select coalesce(daily_points_max, 0) into v_max
      from public.app_settings limit 1;

    if coalesce(v_max, 0) > 0 then
      -- إجمالي الإضافات الموجبة لهذا المخدوم في نفس اليوم المختار
      select coalesce(sum(amount), 0) into v_today_pos
        from public.balance_log
        where member_id = p_member_id
          and amount > 0
          and (created_at at time zone 'UTC')::date = p_date;

      if v_today_pos + p_amount > v_max then
        -- تجاوز الحد اليومي — نرفع خطأ يوضح المتبقي
        raise exception 'daily_limit_exceeded:%:%', v_max, v_today_pos;
      end if;
    end if;
  end if;

  insert into public.balance_log (member_id, amount, reason, created_by)
  values (p_member_id, p_amount, nullif(btrim(coalesce(p_reason,'')), ''), auth.uid());

  update public.members
    set opening_balance = opening_balance + p_amount
    where id = p_member_id
    returning * into v_row;

  return v_row;
end;
$$;

-- Done. Database is at version 0004.
