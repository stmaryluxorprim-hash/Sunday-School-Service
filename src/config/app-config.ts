/**
 * Central app configuration / branding types.
 *
 * Colors are now free-form HEX values chosen by the user (two colors that
 * form the app-wide gradient). Everything is persisted in Supabase
 * (table: public.app_settings) and synced in realtime.
 */

export type Branding = {
  id?: string;
  serviceName: string; // اسم الخدمة
  slogan: string; // الشعار
  codeWord: string; // كلمة الكود (prefix لأكواد المخدومين) مثل StMary
  dailyPointsMax: number; // الحد الأقصى لإضافة النقاط في اليوم (0 = غير محدود)
  colorPrimary: string; // hex, e.g. #6d5dfc
  colorAccent: string; // hex, e.g. #f15bb5
  logoPath: string | null; // storage path (for cleanup)
  logoUrl: string | null; // public URL
  darkMode: boolean;
};

export const DEFAULT_BRANDING: Branding = {
  serviceName: "خدمة الكنيسة",
  slogan: "نخدم بمحبة ونعمل بإخلاص",
  codeWord: "StMary",
  dailyPointsMax: 0,
  colorPrimary: "#6d5dfc",
  colorAccent: "#f15bb5",
  logoPath: null,
  logoUrl: null,
  darkMode: false,
};

/** Convert "#6d5dfc" -> "109 93 252" for CSS rgb() variables. */
export function hexToRgbChannels(hex: string): string {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  return `${r} ${g} ${b}`;
}

/** Lighten a hex toward white by amount 0..1 (used for the "soft" tints). */
export function softChannels(hex: string, amount = 0.82): string {
  const [r, g, b] = hexToRgbChannels(hex).split(" ").map(Number);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `${mix(r)} ${mix(g)} ${mix(b)}`;
}

/** Map DB row (snake_case) -> Branding. */
export function rowToBranding(row: Record<string, unknown>): Branding {
  return {
    id: row.id as string,
    serviceName: (row.service_name as string) ?? DEFAULT_BRANDING.serviceName,
    slogan: (row.slogan as string) ?? DEFAULT_BRANDING.slogan,
    codeWord: (row.code_word as string) ?? DEFAULT_BRANDING.codeWord,
    dailyPointsMax:
      row.daily_points_max != null
        ? Number(row.daily_points_max)
        : DEFAULT_BRANDING.dailyPointsMax,
    colorPrimary: (row.color_primary as string) ?? DEFAULT_BRANDING.colorPrimary,
    colorAccent: (row.color_accent as string) ?? DEFAULT_BRANDING.colorAccent,
    logoPath: (row.logo_path as string) ?? null,
    logoUrl: (row.logo_url as string) ?? null,
    darkMode: (row.dark_mode as boolean) ?? false,
  };
}

/** Map Branding -> DB row (snake_case) for updates. */
export function brandingToRow(b: Partial<Branding>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (b.serviceName !== undefined) row.service_name = b.serviceName;
  if (b.slogan !== undefined) row.slogan = b.slogan;
  if ((b as Partial<Branding>).codeWord !== undefined) row.code_word = b.codeWord;
  if (b.dailyPointsMax !== undefined) row.daily_points_max = b.dailyPointsMax;
  if (b.colorPrimary !== undefined) row.color_primary = b.colorPrimary;
  if (b.colorAccent !== undefined) row.color_accent = b.colorAccent;
  if (b.logoPath !== undefined) row.logo_path = b.logoPath;
  if (b.logoUrl !== undefined) row.logo_url = b.logoUrl;
  if (b.darkMode !== undefined) row.dark_mode = b.darkMode;
  return row;
}
