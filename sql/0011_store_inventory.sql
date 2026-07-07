-- =====================================================================
--  0011_store_inventory.sql  —  متجر الهدايا (Store / Inventory)
--  ---------------------------------------------------------------------
--  السيناريو:
--    * الخادم يضيف هدايا (اسم + صورة + سعر بالنقاط + كمية) — لكل هدية
--      كود QR خاص بها يُطبع على بطاقة الصنف.
--    * عند الشراء: الخادم يمسح QR الأصناف المختارة ثم يمسح كارت المخدوم،
--      فتُخصم النقاط ذرّياً وتُنشأ فاتورة كاملة تظهر في بوابة المخدوم.
--
--  Adds:
--    * store_items          : الأصناف (اسم/صورة/سعر نقاط/مخزون/كود QR)
--    * store_invoices       : الفواتير (رقم متسلسل + الإجمالي)
--    * store_invoice_items  : بنود الفاتورة (لقطة اسم/سعر وقت الشراء)
--    * RPC  store_checkout           : إتمام الشراء ذرّياً (مخزون + رصيد + فاتورة)
--    * RPC  member_portal_invoices   : فواتير المخدوم في بوابته (بالكود السري)
--
--  Idempotent (safe to re-run). Run in Supabase → SQL Editor.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1) store_items : الأصناف
-- ---------------------------------------------------------------------
create table if not exists public.store_items (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,               -- كود QR الخاص بالصنف (يُطبع على البطاقة)
  name         text not null,                      -- اسم الهدية
  points_price numeric(12,2) not null default 0,   -- السعر بالنقاط
  stock        integer not null default 0,         -- الكمية المتاحة
  photo_path   text,                               -- مسار الصورة في التخزين
  photo_url    text,                               -- رابط الصورة العام
  is_active    boolean not null default true,      -- إخفاء الصنف بدون حذفه
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_store_items_code on public.store_items(code);
create index if not exists idx_store_items_created on public.store_items(created_at desc);

drop trigger if exists trg_store_items_updated on public.store_items;
create trigger trg_store_items_updated
  before update on public.store_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 2) store_invoices : الفواتير
-- ---------------------------------------------------------------------
create sequence if not exists public.store_invoice_no_seq;

create table if not exists public.store_invoices (
  id           uuid primary key default gen_random_uuid(),
  invoice_no   bigint not null default nextval('public.store_invoice_no_seq'),
  member_id    uuid not null references public.members(id) on delete cascade,
  total_points numeric(12,2) not null default 0,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists idx_store_invoices_member on public.store_invoices(member_id);
create index if not exists idx_store_invoices_created on public.store_invoices(created_at desc);

-- ---------------------------------------------------------------------
-- 3) store_invoice_items : بنود الفاتورة (لقطة وقت الشراء)
-- ---------------------------------------------------------------------
create table if not exists public.store_invoice_items (
  id         uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.store_invoices(id) on delete cascade,
  item_id    uuid references public.store_items(id) on delete set null,
  item_name  text not null,                        -- لقطة اسم الصنف
  photo_url  text,                                 -- لقطة صورة الصنف
  unit_price numeric(12,2) not null default 0,     -- لقطة السعر
  qty        integer not null default 1,
  line_total numeric(12,2) not null default 0
);
create index if not exists idx_store_inv_items_invoice on public.store_invoice_items(invoice_id);

-- ---------------------------------------------------------------------
-- 4) RLS — قراءة/كتابة للمستخدمين المسجّلين (الخدّام)
-- ---------------------------------------------------------------------
alter table public.store_items         enable row level security;
alter table public.store_invoices      enable row level security;
alter table public.store_invoice_items enable row level security;

drop policy if exists "store_items_select" on public.store_items;
create policy "store_items_select" on public.store_items for select to authenticated using (true);
drop policy if exists "store_items_insert" on public.store_items;
create policy "store_items_insert" on public.store_items for insert to authenticated with check (true);
drop policy if exists "store_items_update" on public.store_items;
create policy "store_items_update" on public.store_items for update to authenticated using (true);
drop policy if exists "store_items_delete" on public.store_items;
create policy "store_items_delete" on public.store_items for delete to authenticated using (true);

drop policy if exists "store_invoices_select" on public.store_invoices;
create policy "store_invoices_select" on public.store_invoices for select to authenticated using (true);
drop policy if exists "store_invoices_delete" on public.store_invoices;
create policy "store_invoices_delete" on public.store_invoices for delete to authenticated using (true);

drop policy if exists "store_inv_items_select" on public.store_invoice_items;
create policy "store_inv_items_select" on public.store_invoice_items for select to authenticated using (true);

-- ---------------------------------------------------------------------
-- 5) RPC: store_checkout — إتمام الشراء ذرّياً
--    p_member_id : المخدوم المشتري
--    p_items     : jsonb مصفوفة [{"item_id":"uuid","qty":2}, ...]
--    الخطوات (كلها في معاملة واحدة):
--      1. قفل الأصناف والتحقق من المخزون.
--      2. حساب الإجمالي والتحقق من كفاية رصيد المخدوم.
--      3. خصم المخزون + خصم الرصيد + تسجيل balance_log.
--      4. إنشاء الفاتورة والبنود.
--    أخطاء واضحة:  item_not_found / out_of_stock:<name>:<available>
--                  insufficient_balance:<balance>:<total> / empty_cart
-- ---------------------------------------------------------------------
create or replace function public.store_checkout(
  p_member_id uuid,
  p_items     jsonb
)
returns table (invoice_id uuid, invoice_no bigint, total_points numeric, new_balance numeric)
language plpgsql
security invoker
as $$
declare
  v_member   public.members;
  v_total    numeric := 0;
  v_line     record;
  v_item     public.store_items;
  v_inv_id   uuid;
  v_inv_no   bigint;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_cart';
  end if;

  -- قفل صف المخدوم
  select * into v_member from public.members where id = p_member_id for update;
  if not found then
    raise exception 'member_not_found';
  end if;

  -- تحقق من الأصناف والمخزون واحسب الإجمالي (مع قفل الصفوف)
  for v_line in
    select (e->>'item_id')::uuid as item_id,
           greatest(coalesce((e->>'qty')::int, 1), 1) as qty
    from jsonb_array_elements(p_items) e
  loop
    select * into v_item from public.store_items
      where id = v_line.item_id and is_active
      for update;
    if not found then
      raise exception 'item_not_found';
    end if;
    if v_item.stock < v_line.qty then
      raise exception 'out_of_stock:%:%', v_item.name, v_item.stock;
    end if;
    v_total := v_total + v_item.points_price * v_line.qty;
  end loop;

  -- تحقق من كفاية الرصيد
  if coalesce(v_member.opening_balance, 0) < v_total then
    raise exception 'insufficient_balance:%:%', coalesce(v_member.opening_balance, 0), v_total;
  end if;

  -- أنشئ الفاتورة
  insert into public.store_invoices (member_id, total_points, created_by)
  values (p_member_id, v_total, auth.uid())
  returning id, store_invoices.invoice_no into v_inv_id, v_inv_no;

  -- البنود + خصم المخزون
  for v_line in
    select (e->>'item_id')::uuid as item_id,
           greatest(coalesce((e->>'qty')::int, 1), 1) as qty
    from jsonb_array_elements(p_items) e
  loop
    select * into v_item from public.store_items where id = v_line.item_id;

    insert into public.store_invoice_items
      (invoice_id, item_id, item_name, photo_url, unit_price, qty, line_total)
    values
      (v_inv_id, v_item.id, v_item.name, v_item.photo_url,
       v_item.points_price, v_line.qty, v_item.points_price * v_line.qty);

    update public.store_items
      set stock = stock - v_line.qty
      where id = v_item.id;
  end loop;

  -- خصم الرصيد + سجل النقاط (يظهر في بوابة المخدوم)
  insert into public.balance_log (member_id, amount, reason, created_by)
  values (p_member_id, -v_total, 'شراء من المتجر — فاتورة #' || v_inv_no, auth.uid());

  update public.members
    set opening_balance = opening_balance - v_total
    where id = p_member_id;

  return query
    select v_inv_id, v_inv_no, v_total,
           (select m.opening_balance from public.members m where m.id = p_member_id);
end;
$$;

-- ---------------------------------------------------------------------
-- 6) RPC: member_portal_invoices — فواتير المخدوم في بوابته
--    مصادقة بالكود السري للكارت (مثل باقي RPCs البوابة).
--    تُرجع كل فاتورة مع بنودها مجمّعة jsonb.
-- ---------------------------------------------------------------------
create or replace function public.member_portal_invoices(p_code text)
returns table (
  id uuid,
  invoice_no bigint,
  total_points numeric,
  created_at timestamptz,
  items jsonb
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
    select i.id, i.invoice_no, i.total_points, i.created_at,
           coalesce(
             (select jsonb_agg(jsonb_build_object(
                'item_name', li.item_name,
                'photo_url', li.photo_url,
                'unit_price', li.unit_price,
                'qty', li.qty,
                'line_total', li.line_total
              ) order by li.item_name)
              from public.store_invoice_items li
              where li.invoice_id = i.id),
             '[]'::jsonb
           ) as items
    from public.store_invoices i
    where i.member_id = v.id
    order by i.created_at desc
    limit 200;
end;
$$;

grant execute on function public.member_portal_invoices(text) to anon, authenticated;

-- realtime (اختياري — لتحديث المخزون لحظياً)
alter table public.store_items replica identity full;
do $$
begin
  if not exists (select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='store_items') then
    alter publication supabase_realtime add table public.store_items;
  end if;
end $$;

-- Done. Database is at version 0011.
