-- =====================================================================
--  0007_notifications.sql  —  Broadcast notifications + device push
--  ---------------------------------------------------------------------
--  Adds:
--    * notifications        : a broadcast message sent to all users
--    * notification_reads    : per-user "read" marker (stays unread until read)
--    * push_subscriptions    : each user's device Web-Push subscription
--
--  Idempotent (safe to re-run). Run in Supabase → SQL Editor.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- notifications : إشعار عام يُرسل لكل المستخدمين
-- ---------------------------------------------------------------------
create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  body         text not null,                          -- نص الإشعار
  sender_id    uuid references auth.users(id) on delete set null,
  sender_name  text,                                   -- اسم المرسِل للعرض
  created_at   timestamptz not null default now()
);
create index if not exists idx_notifications_created on public.notifications(created_at desc);

-- ---------------------------------------------------------------------
-- notification_reads : علامة "مقروء" لكل مستخدم على حدة
-- (يبقى الإشعار غير مقروء حتى يوجد صفّ هنا)
-- ---------------------------------------------------------------------
create table if not exists public.notification_reads (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  read_at         timestamptz not null default now(),
  primary key (notification_id, user_id)
);
create index if not exists idx_notifreads_user on public.notification_reads(user_id);

-- ---------------------------------------------------------------------
-- push_subscriptions : اشتراك الجهاز في إشعارات الويب (Web Push)
-- ---------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  endpoint    text not null unique,                    -- معرّف فريد للجهاز/المتصفح
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_push_user on public.push_subscriptions(user_id);

drop trigger if exists trg_push_updated on public.push_subscriptions;
create trigger trg_push_updated
  before update on public.push_subscriptions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.notifications       enable row level security;
alter table public.notification_reads  enable row level security;
alter table public.push_subscriptions  enable row level security;

-- notifications: any authenticated user can read & send.
drop policy if exists "notif_select" on public.notifications;
create policy "notif_select" on public.notifications for select to authenticated using (true);
drop policy if exists "notif_insert" on public.notifications;
create policy "notif_insert" on public.notifications for insert to authenticated with check (true);
drop policy if exists "notif_delete" on public.notifications;
create policy "notif_delete" on public.notifications for delete to authenticated using (true);

-- notification_reads: a user manages only their own read markers.
drop policy if exists "notifreads_select" on public.notification_reads;
create policy "notifreads_select" on public.notification_reads for select to authenticated using (user_id = auth.uid());
drop policy if exists "notifreads_insert" on public.notification_reads;
create policy "notifreads_insert" on public.notification_reads for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "notifreads_delete" on public.notification_reads;
create policy "notifreads_delete" on public.notification_reads for delete to authenticated using (user_id = auth.uid());

-- push_subscriptions: a user manages only their own device subscriptions.
drop policy if exists "push_select" on public.push_subscriptions;
create policy "push_select" on public.push_subscriptions for select to authenticated using (user_id = auth.uid());
drop policy if exists "push_insert" on public.push_subscriptions;
create policy "push_insert" on public.push_subscriptions for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "push_update" on public.push_subscriptions;
create policy "push_update" on public.push_subscriptions for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "push_delete" on public.push_subscriptions;
create policy "push_delete" on public.push_subscriptions for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Realtime : بث الإشعارات الجديدة داخل التطبيق فوراً
-- ---------------------------------------------------------------------
alter table public.notifications      replica identity full;
alter table public.notification_reads replica identity full;
do $$
begin
  if not exists (select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
  if not exists (select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='notification_reads') then
    alter publication supabase_realtime add table public.notification_reads;
  end if;
end $$;

-- Done. Broadcast notifications + device push are ready.
