/**
 * بروفايلات البطاقة — CRUD على Supabase (public.card_profiles)
 * + ربط الفصل ببروفايل افتراضي (classes.default_card_profile_id).
 */

import { createClient } from "@/lib/supabase/client";
import { CardProfileRow, CardPrintOptions, CardTheme } from "./types";

export type ProfileResult =
  | { ok: true; profile: CardProfileRow; message: string }
  | { ok: false; message: string };

/** جلب كل البروفايلات. */
export async function loadCardProfiles(): Promise<CardProfileRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("card_profiles")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) return [];
  return (data as CardProfileRow[]) ?? [];
}

/** حفظ بروفايل جديد من الإعدادات الحالية + الثيم النشط. */
export async function saveCardProfile(
  name: string,
  icon: string,
  theme: CardTheme,
  opts: CardPrintOptions,
  headerColorEnabled: boolean,
  footerColorEnabled: boolean,
  headerColorValue: string,
  footerColorValue: string
): Promise<ProfileResult> {
  const supabase = createClient();
  const row = {
    name: name.trim(),
    icon,
    bg_color1: theme.c1,
    bg_color2: theme.c2,
    text_color: theme.text,
    // الألوان محفوظة دائماً، وenabled يحدد هل تُطبَّق
    header_color: opts.headerColor || headerColorValue || "#1e293b",
    footer_color: opts.footerColor || footerColorValue || "#1e293b",
    header_text_color: opts.headerTextColor || "#ffffff",
    footer_text_color: opts.footerTextColor || "#ffffff",
    header_color_enabled: headerColorEnabled,
    footer_color_enabled: footerColorEnabled,
    use_logo_instead_of_photo: opts.useLogoInsteadOfPhoto,
    print_mode: opts.mode,
    show_front_header: opts.frontHeader,
    show_front_name: opts.frontName,
    show_front_qr: opts.frontQR,
    show_front_photo: opts.frontPhoto,
    show_front_footer: opts.frontFooter,
    show_front_id: opts.frontId,
    show_back_logo: opts.backLogo,
    show_back_service_name: opts.backServiceName,
  };
  const { data, error } = await supabase
    .from("card_profiles")
    .insert(row)
    .select()
    .single();
  if (error || !data) {
    if (/relation .*card_profiles.* does not exist/i.test(error?.message || ""))
      return { ok: false, message: "الجدول غير موجود — نفّذ sql/0009_card_profiles.sql أولاً" };
    return { ok: false, message: "تعذّر حفظ البروفايل" };
  }
  return { ok: true, profile: data as CardProfileRow, message: "تم حفظ البروفايل" };
}

/** حذف بروفايل. */
export async function deleteCardProfile(id: string): Promise<{ ok: boolean; message: string }> {
  const supabase = createClient();
  const { error } = await supabase.from("card_profiles").delete().eq("id", id);
  if (error) return { ok: false, message: "تعذّر حذف البروفايل" };
  return { ok: true, message: "تم حذف البروفايل" };
}

/** ربط/فك ربط فصل ببروفايل افتراضي. */
export async function setClassDefaultProfile(
  classId: string,
  profileId: string | null
): Promise<{ ok: boolean; message: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("classes")
    .update({ default_card_profile_id: profileId })
    .eq("id", classId);
  if (error) return { ok: false, message: "تعذّر ربط الفصل بالبروفايل" };
  return {
    ok: true,
    message: profileId ? "تم ربط الفصل بالبروفايل" : "تم فك ربط الفصل",
  };
}
