/**
 * Central app configuration — the single source of truth for branding & theme.
 *
 * Everything here is configurable from the Settings page. In later steps these
 * defaults will be overridden by values stored in Supabase (per organization),
 * so the app stays fully upgradable without code changes.
 */

export type ThemePreset = {
  id: string;
  name: string; // Arabic display name
  primary: string; // "r g b"
  primarySoft: string;
  accent: string;
  accentSoft: string;
  secondary: string;
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "aurora",
    name: "الشفق",
    primary: "109 93 252",
    primarySoft: "224 221 255",
    accent: "241 91 181",
    accentSoft: "255 224 242",
    secondary: "0 187 249",
  },
  {
    id: "emerald",
    name: "الزمرد",
    primary: "16 185 129",
    primarySoft: "209 250 229",
    accent: "245 158 11",
    accentSoft: "254 243 199",
    secondary: "20 184 166",
  },
  {
    id: "royal",
    name: "الملكي",
    primary: "37 99 235",
    primarySoft: "219 234 254",
    accent: "234 179 8",
    accentSoft: "254 249 195",
    secondary: "99 102 241",
  },
  {
    id: "sunset",
    name: "الغروب",
    primary: "239 68 68",
    primarySoft: "254 226 226",
    accent: "249 115 22",
    accentSoft: "255 237 213",
    secondary: "217 70 239",
  },
];

export type Branding = {
  serviceName: string; // اسم الخدمة
  slogan: string; // الشعار
  iconUrl: string | null; // أيقونة (رابط) — later stored in Supabase storage
  themeId: string;
  darkMode: boolean;
};

export const DEFAULT_BRANDING: Branding = {
  serviceName: "خدمة الكنيسة",
  slogan: "نخدم بمحبة ونعمل بإخلاص",
  iconUrl: null,
  themeId: "aurora",
  darkMode: false,
};

export function getPreset(themeId: string): ThemePreset {
  return THEME_PRESETS.find((t) => t.id === themeId) ?? THEME_PRESETS[0];
}
