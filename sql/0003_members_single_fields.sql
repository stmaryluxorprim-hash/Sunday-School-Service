-- =====================================================================
--  Version: 0003
--  Title:   Members → single-column name + birth_date, phone as +2
--  Step:    Bulk editable cards (fix insert + schema reconcile)
--  Run this in: Supabase Dashboard → SQL Editor → New query → Run
--  Note: idempotent & safe. Works whether you applied the OLD 0002
--        (name1..name4 + birth_day/month/year + full_name) or the NEW one.
--        It adds the single columns, backfills from the split columns if
--        they exist, normalizes phone to "+2…", then drops the old columns.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Drop the generated full_name column (can't keep it alongside `name`)
-- ---------------------------------------------------------------------
alter table public.members drop column if exists full_name;

-- ---------------------------------------------------------------------
-- 2) Add the new single columns (nullable for now so backfill is safe)
-- ---------------------------------------------------------------------
alter table public.members add column if not exists name text;
alter table public.members add column if not exists birth_date date;

-- ---------------------------------------------------------------------
-- 3) Backfill `name` from name1..name4 (only if those columns exist)
-- ---------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='members' and column_name='name1'
  ) then
    update public.members
      set name = btrim(
        coalesce(name1,'') || ' ' ||
        coalesce(name2,'') || ' ' ||
        coalesce(name3,'') || ' ' ||
        coalesce(name4,'')
      )
      where name is null or btrim(name) = '';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 4) Backfill `birth_date` from birth_day / birth_month / birth_year
-- ---------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='members' and column_name='birth_year'
  ) then
    update public.members
      set birth_date = make_date(birth_year, birth_month, birth_day)
      where birth_date is null
        and birth_year is not null
        and birth_month is not null
        and birth_day is not null;
  end if;
exception when others then
  -- ignore bad/partial dates; they simply stay null
  null;
end $$;

-- ---------------------------------------------------------------------
-- 5) Normalize phone to "+2" + 11 digits (idempotent)
--    - strips non-digits
--    - drops a leading country code (2 / 002)
--    - adds leading 0 when 10 digits
--    - only sets +2 when the result is a valid 11-digit local number
-- ---------------------------------------------------------------------
do $$
declare
  r record;
  d text;
begin
  for r in select id, phone from public.members where phone is not null and phone <> '' loop
    d := regexp_replace(r.phone, '\D', '', 'g');
    if left(d,3) = '002' then d := substr(d,4);
    elsif length(d) in (12,13) and left(d,1) = '2' then d := substr(d,2);
    end if;
    if length(d) = 10 and left(d,1) <> '0' then d := '0' || d; end if;
    if d ~ '^0\d{10}$' then
      update public.members set phone = '+2' || d where id = r.id;
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 6) Enforce NOT NULL on name (default '' for any leftover rows first)
-- ---------------------------------------------------------------------
update public.members set name = '' where name is null;
alter table public.members alter column name set not null;

-- ---------------------------------------------------------------------
-- 7) Drop the old split columns (now redundant)
-- ---------------------------------------------------------------------
alter table public.members drop column if exists name1;
alter table public.members drop column if exists name2;
alter table public.members drop column if exists name3;
alter table public.members drop column if exists name4;
alter table public.members drop column if exists birth_day;
alter table public.members drop column if exists birth_month;
alter table public.members drop column if exists birth_year;

-- Done. Members now have: name (text), birth_date (date), phone ("+2…").
