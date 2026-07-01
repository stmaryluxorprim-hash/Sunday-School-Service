-- =====================================================================
--  0006_messaging.sql  —  Internal messaging (تطبيق الرسائل الداخلي)
--  ---------------------------------------------------------------------
--  Adds a lightweight internal messaging system:
--    * conversations       : a thread (optionally linked to a member)
--    * conversation_members : which auth users participate in a thread
--    * messages            : the messages in a thread
--
--  Idempotent (safe to re-run). Run in Supabase → SQL Editor.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- conversations : محادثة (قد تكون مرتبطة بمخدوم أو محادثة عامة)
-- ---------------------------------------------------------------------
create table if not exists public.conversations (
  id           uuid primary key default gen_random_uuid(),
  title        text,                                  -- عنوان اختياري
  member_id    uuid references public.members(id) on delete set null, -- محادثة مرتبطة بمخدوم
  created_by   uuid references auth.users(id) on delete set null,
  last_message text,                                  -- آخر رسالة (لعرض القائمة سريعاً)
  last_at      timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_conversations_member on public.conversations(member_id);
create index if not exists idx_conversations_last on public.conversations(last_at desc);

-- ---------------------------------------------------------------------
-- conversation_members : مشاركو المحادثة (المستخدمون)
-- ---------------------------------------------------------------------
create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index if not exists idx_convmembers_user on public.conversation_members(user_id);

-- ---------------------------------------------------------------------
-- messages : الرسائل
-- ---------------------------------------------------------------------
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid references auth.users(id) on delete set null,
  sender_name     text,                               -- اسم المرسِل للعرض
  body            text not null,
  created_at      timestamptz not null default now()
);
create index if not exists idx_messages_conversation on public.messages(conversation_id, created_at);

-- ---------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------
drop trigger if exists trg_conversations_updated on public.conversations;
create trigger trg_conversations_updated
  before update on public.conversations
  for each row execute function public.set_updated_at();

-- عند إضافة رسالة: حدّث آخر رسالة/وقت في المحادثة
create or replace function public.on_new_message()
returns trigger language plpgsql security definer as $$
begin
  update public.conversations
    set last_message = left(new.body, 140),
        last_at = new.created_at,
        updated_at = now()
    where id = new.conversation_id;
  return new;
end; $$;

drop trigger if exists trg_on_new_message on public.messages;
create trigger trg_on_new_message
  after insert on public.messages
  for each row execute function public.on_new_message();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.conversations        enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages             enable row level security;

-- Simplicity: any authenticated user in the service can read/write messaging.
-- (يمكن تضييقها لاحقاً حسب RBAC)
drop policy if exists "conv_select" on public.conversations;
create policy "conv_select" on public.conversations for select to authenticated using (true);
drop policy if exists "conv_insert" on public.conversations;
create policy "conv_insert" on public.conversations for insert to authenticated with check (true);
drop policy if exists "conv_update" on public.conversations;
create policy "conv_update" on public.conversations for update to authenticated using (true) with check (true);
drop policy if exists "conv_delete" on public.conversations;
create policy "conv_delete" on public.conversations for delete to authenticated using (true);

drop policy if exists "convmem_all" on public.conversation_members;
create policy "convmem_all" on public.conversation_members for all to authenticated using (true) with check (true);

drop policy if exists "msg_select" on public.messages;
create policy "msg_select" on public.messages for select to authenticated using (true);
drop policy if exists "msg_insert" on public.messages;
create policy "msg_insert" on public.messages for insert to authenticated with check (true);
drop policy if exists "msg_delete" on public.messages;
create policy "msg_delete" on public.messages for delete to authenticated using (true);

-- ---------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------
alter table public.conversations replica identity full;
alter table public.messages      replica identity full;
do $$
begin
  if not exists (select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='conversations') then
    alter publication supabase_realtime add table public.conversations;
  end if;
  if not exists (select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Helper RPC: find-or-create a conversation for a member (used by the
-- "رسالة داخلية" button on the data page).
-- ---------------------------------------------------------------------
create or replace function public.get_or_create_member_conversation(
  p_member_id uuid, p_title text default null)
returns public.conversations language plpgsql security invoker as $$
declare v_row public.conversations;
begin
  select * into v_row from public.conversations
    where member_id = p_member_id order by created_at limit 1;
  if not found then
    insert into public.conversations (title, member_id, created_by)
    values (coalesce(p_title, 'محادثة'), p_member_id, auth.uid())
    returning * into v_row;
    insert into public.conversation_members (conversation_id, user_id)
    values (v_row.id, auth.uid())
    on conflict do nothing;
  end if;
  return v_row;
end; $$;

-- Done. Database messaging is ready.
