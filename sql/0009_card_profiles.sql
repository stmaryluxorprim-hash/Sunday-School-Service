-- 0009_card_profiles.sql
-- بروفايلات بطاقات الطباعة + ربط الفصل ببروفايل افتراضي
-- شغّل هذا الملف في Supabase → SQL Editor

create table if not exists public.card_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text default 'id-card',
  bg_color1 text not null default '#6366f1',
  bg_color2 text not null default '#8b5cf6',
  text_color text not null default '#ffffff',
  header_color text,
  footer_color text,
  header_text_color text,
  footer_text_color text,
  header_color_enabled boolean default false,
  footer_color_enabled boolean default false,
  use_logo_instead_of_photo boolean default false,
  print_mode text default 'both', -- 'front' | 'both' | 'back'
  show_front_header boolean default true,
  show_front_name boolean default true,
  show_front_qr boolean default true,
  show_front_photo boolean default true,
  show_front_footer boolean default true,
  show_front_id boolean default false,
  show_back_logo boolean default true,
  show_back_service_name boolean default true,
  created_at timestamptz default now()
);

alter table public.card_profiles enable row level security;

drop policy if exists "card_profiles_select" on public.card_profiles;
create policy "card_profiles_select" on public.card_profiles
  for select to authenticated using (true);

drop policy if exists "card_profiles_insert" on public.card_profiles;
create policy "card_profiles_insert" on public.card_profiles
  for insert to authenticated with check (true);

drop policy if exists "card_profiles_update" on public.card_profiles;
create policy "card_profiles_update" on public.card_profiles
  for update to authenticated using (true);

drop policy if exists "card_profiles_delete" on public.card_profiles;
create policy "card_profiles_delete" on public.card_profiles
  for delete to authenticated using (true);

-- ربط الفصل ببروفايل بطاقة افتراضي (يُستخدم تلقائياً عند الطباعة)
alter table public.classes
  add column if not exists default_card_profile_id uuid
  references public.card_profiles(id) on delete set null;
