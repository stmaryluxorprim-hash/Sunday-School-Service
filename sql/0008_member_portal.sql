-- =====================================================================
--  0008_member_portal.sql  —  Member Portal (بوابة المخدوم)
--  ---------------------------------------------------------------------
--  Members log in to their own portal by scanning their card (QR = code).
--  They are NOT Supabase auth users, so all portal reads/writes go through
--  SECURITY DEFINER RPCs that authenticate by the SECRET card code
--  (possession of the card = possession of the code).
--
--  Adds:
--    * messages.sender_member_id          : member-sent messages marker
--    * member_notification_reads          : per-member notification read marker
--    * RPCs (all keyed by p_code):
--        member_portal_login / member_portal_get
--        member_portal_attendance / member_portal_points
--        member_portal_messages / member_portal_send_message
--        member_portal_notifications / member_portal_mark_notifications_read
--
--  Idempotent (safe to re-run). Run in Supabase → SQL Editor.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) messages: تمييز الرسائل المرسلة من المخدوم نفسه
-- ---------------------------------------------------------------------
alter table public.messages
  add column if not exists sender_member_id uuid references public.members(id) on delete set null;

-- ---------------------------------------------------------------------
-- 2) member_notification_reads : علامة "مقروء" لكل مخدوم على حدة
-- ---------------------------------------------------------------------
create table if not exists public.member_notification_reads (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  member_id       uuid not null references public.members(id) on delete cascade,
  read_at         timestamptz not null default now(),
  primary key (notification_id, member_id)
);

alter table public.member_notification_reads enable row level security;
-- No direct policies: access only through the SECURITY DEFINER RPCs below.

-- ---------------------------------------------------------------------
-- 3) Helper: resolve a member id from the secret card code (or raise)
-- ---------------------------------------------------------------------
create or replace function public._member_from_code(p_code text)
returns public.members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.members;
begin
  select * into v_member
    from public.members
    where code = trim(p_code)
    limit 1;
  if not found then
    raise exception 'MEMBER_NOT_FOUND';
  end if;
  return v_member;
end;
$$;

revoke all on function public._member_from_code(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 4) member_portal_login — التحقق من كود الكارت وإرجاع بيانات مختصرة
-- ---------------------------------------------------------------------
create or replace function public.member_portal_login(p_code text)
returns table (id uuid, code text, name text, photo_url text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.members;
begin
  v := public._member_from_code(p_code);
  return query select v.id, v.code, v.name, v.photo_url;
end;
$$;

-- ---------------------------------------------------------------------
-- 5) member_portal_get — البيانات الكاملة للمخدوم + اسم الفصل
-- ---------------------------------------------------------------------
create or replace function public.member_portal_get(p_code text)
returns table (
  id uuid, code text, name text, phone text, birth_date date,
  address text, notes text, photo_url text, opening_balance numeric,
  attendance_count integer, gender text, class_name text, created_at timestamptz
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
    select v.id, v.code, v.name, v.phone, v.birth_date, v.address, v.notes,
           v.photo_url, v.opening_balance, v.attendance_count, v.gender::text,
           coalesce(nullif(c.name, ''), c.stage) as class_name, v.created_at
    from (select 1) _
    left join public.classes c on c.id = v.class_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 6) member_portal_attendance — سجل حضور المخدوم (الأحدث أولاً)
-- ---------------------------------------------------------------------
create or replace function public.member_portal_attendance(p_code text)
returns table (id uuid, attended_on date, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.members;
begin
  v := public._member_from_code(p_code);
  return query
    select a.id, a.attended_on, a.created_at
    from public.attendance_log a
    where a.member_id = v.id
    order by a.attended_on desc
    limit 500;
end;
$$;

-- ---------------------------------------------------------------------
-- 7) member_portal_points — سجل نقاط المخدوم (الأحدث أولاً)
-- ---------------------------------------------------------------------
create or replace function public.member_portal_points(p_code text)
returns table (id uuid, amount numeric, reason text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.members;
begin
  v := public._member_from_code(p_code);
  return query
    select b.id, b.amount, b.reason, b.created_at
    from public.balance_log b
    where b.member_id = v.id
    order by b.created_at desc
    limit 500;
end;
$$;

-- ---------------------------------------------------------------------
-- 8) member_portal_messages — رسائل محادثة المخدوم (تُنشأ عند الحاجة)
-- ---------------------------------------------------------------------
create or replace function public.member_portal_messages(p_code text)
returns table (
  id uuid, body text, sender_name text, from_member boolean, created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.members;
  v_conv uuid;
begin
  v := public._member_from_code(p_code);
  select cv.id into v_conv
    from public.conversations cv
    where cv.member_id = v.id
    order by cv.created_at
    limit 1;
  if v_conv is null then
    return;
  end if;
  return query
    select m.id, m.body, m.sender_name,
           (m.sender_member_id is not null) as from_member, m.created_at
    from public.messages m
    where m.conversation_id = v_conv
    order by m.created_at asc
    limit 500;
end;
$$;

-- ---------------------------------------------------------------------
-- 9) member_portal_send_message — إرسال رسالة من المخدوم للخدّام
-- ---------------------------------------------------------------------
create or replace function public.member_portal_send_message(p_code text, p_body text)
returns table (
  id uuid, body text, sender_name text, from_member boolean, created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.members;
  v_conv uuid;
  v_msg public.messages;
begin
  v := public._member_from_code(p_code);
  if coalesce(trim(p_body), '') = '' then
    raise exception 'EMPTY_BODY';
  end if;

  select cv.id into v_conv
    from public.conversations cv
    where cv.member_id = v.id
    order by cv.created_at
    limit 1;

  if v_conv is null then
    insert into public.conversations (title, member_id)
    values (v.name, v.id)
    returning conversations.id into v_conv;
  end if;

  insert into public.messages (conversation_id, sender_member_id, sender_name, body)
  values (v_conv, v.id, v.name, trim(p_body))
  returning * into v_msg;

  return query
    select v_msg.id, v_msg.body, v_msg.sender_name, true, v_msg.created_at;
end;
$$;

-- ---------------------------------------------------------------------
-- 10) member_portal_notifications — الإشعارات العامة + حالة القراءة
-- ---------------------------------------------------------------------
create or replace function public.member_portal_notifications(p_code text)
returns table (
  id uuid, body text, sender_name text, created_at timestamptz, is_read boolean
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
    select n.id, n.body, n.sender_name, n.created_at,
           (r.notification_id is not null) as is_read
    from public.notifications n
    left join public.member_notification_reads r
      on r.notification_id = n.id and r.member_id = v.id
    order by n.created_at desc
    limit 200;
end;
$$;

-- ---------------------------------------------------------------------
-- 11) member_portal_mark_notifications_read — تعليم الكل كمقروء
-- ---------------------------------------------------------------------
create or replace function public.member_portal_mark_notifications_read(p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.members;
begin
  v := public._member_from_code(p_code);
  insert into public.member_notification_reads (notification_id, member_id)
  select n.id, v.id from public.notifications n
  on conflict do nothing;
end;
$$;

-- ---------------------------------------------------------------------
-- 12) Grants — the portal RPCs are callable with the public anon key.
--     Security = knowledge of the SECRET card code (possession of card).
-- ---------------------------------------------------------------------
grant execute on function public.member_portal_login(text)                    to anon, authenticated;
grant execute on function public.member_portal_get(text)                      to anon, authenticated;
grant execute on function public.member_portal_attendance(text)               to anon, authenticated;
grant execute on function public.member_portal_points(text)                   to anon, authenticated;
grant execute on function public.member_portal_messages(text)                 to anon, authenticated;
grant execute on function public.member_portal_send_message(text, text)       to anon, authenticated;
grant execute on function public.member_portal_notifications(text)            to anon, authenticated;
grant execute on function public.member_portal_mark_notifications_read(text)  to anon, authenticated;

-- Done. Member portal database layer is ready.
