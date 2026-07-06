/**
 * أنواع وإعدادات طباعة البطاقات — منقولة بالكامل من نظام الطباعة المرجعي:
 *  - حجم البطاقة: A6 (105×74مم) أو CR80 (86×54مم)
 *  - وضع الطباعة: وش فقط / وش+ظهر / ظهر فقط
 *  - عناصر الوش والظهر قابلة للتفعيل/التعطيل
 *  - المساحة الآمنة للقص (عالميّة — مستقلة عن البروفايل)
 *  - ألوان الهيدر/الفوتر المتقدمة
 *  - إعدادات الطباعة الجماعية A4: تباعد أفقي/رأسي، خطوط دلالة (قص/حدود)،
 *    ترتيب الوجهين (فوق بعض للطي / جنب بعض)، وجه الطباعة
 *  - بروفايلات البطاقة (محفوظة في Supabase) + ربطها بالفصول
 */

export type CardSize = "A6" | "CR80";
export type PrintMode = "front" | "both" | "back";
export type BulkLayout = "folded" | "sideBySide";

/** ثيم ألوان البطاقة (خلفية متدرجة + لون خط). */
export type CardTheme = {
  id: string;
  name: string;
  c1: string; // لون التدرج الأول
  c2: string; // لون التدرج الثاني
  text: string; // لون الخط
};

/** صف بروفايل البطاقة في Supabase (public.card_profiles). */
export type CardProfileRow = {
  id: string;
  name: string;
  icon: string | null;
  bg_color1: string;
  bg_color2: string;
  text_color: string;
  header_color: string | null;
  footer_color: string | null;
  header_text_color: string | null;
  footer_text_color: string | null;
  header_color_enabled: boolean | null;
  footer_color_enabled: boolean | null;
  use_logo_instead_of_photo: boolean | null;
  print_mode: PrintMode | null;
  show_front_header: boolean | null;
  show_front_name: boolean | null;
  show_front_qr: boolean | null;
  show_front_photo: boolean | null;
  show_front_footer: boolean | null;
  show_front_id: boolean | null;
  show_back_logo: boolean | null;
  show_back_service_name: boolean | null;
  created_at?: string;
};

/** كل خيارات الطباعة (تُحفظ محلياً في localStorage). */
export type CardPrintOptions = {
  cardSize: CardSize;
  mode: PrintMode;
  // عناصر الوش
  frontHeader: boolean;
  frontName: boolean;
  frontQR: boolean;
  frontPhoto: boolean;
  frontFooter: boolean;
  frontId: boolean;
  // عناصر الظهر
  backLogo: boolean;
  backServiceName: boolean;
  // اللوجو بدل صورة المخدوم
  useLogoInsteadOfPhoto: boolean;
  // المساحة الآمنة للقص (مم) — عالمية مستقلة عن البروفايل
  safeMargin: number; // 2 — 10
  // ألوان الهيدر/الفوتر ('' = تلقائي)
  headerColor: string;
  footerColor: string;
  headerTextColor: string;
  footerTextColor: string;
  // الطباعة الجماعية
  bulkGapX: number; // تباعد أفقي بين الأعمدة (0–20 مم)
  bulkGapY: number; // تباعد رأسي بين الصفوف (0–20 مم)
  bulkShowFoldLine: boolean; // خط القص الرأسي في منتصف الورقة
  bulkShowCutLines: boolean; // خط حدود البطاقة
  bulkCutLineOffset: number; // بُعد خط الحدود عن حافة البطاقة (0–10 مم)
  bulkLineColor: string; // لون خطوط الدلالة
  bulkLayout: BulkLayout; // ترتيب الوجهين
};

export const DEFAULT_CARD_OPTS: CardPrintOptions = {
  cardSize: "A6",
  mode: "both",
  frontHeader: true,
  frontName: true,
  frontQR: true,
  frontPhoto: true,
  frontFooter: true,
  frontId: false,
  backLogo: true,
  backServiceName: true,
  useLogoInsteadOfPhoto: false,
  safeMargin: 4,
  headerColor: "",
  footerColor: "",
  headerTextColor: "",
  footerTextColor: "",
  bulkGapX: 2,
  bulkGapY: 2,
  bulkShowFoldLine: false,
  bulkShowCutLines: false,
  bulkCutLineOffset: 0,
  bulkLineColor: "#6366f1",
  bulkLayout: "folded",
};

const CARD_OPT_KEY = "church.cardPrintOptions.v1";

/** تحميل الخيارات المحفوظة من localStorage (مع الافتراضيات). */
export function loadCardPrintOptions(): CardPrintOptions {
  if (typeof window === "undefined") return { ...DEFAULT_CARD_OPTS };
  try {
    const raw = localStorage.getItem(CARD_OPT_KEY);
    if (raw) return { ...DEFAULT_CARD_OPTS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_CARD_OPTS };
}

/** حفظ الخيارات في localStorage. */
export function saveCardPrintOptions(opts: CardPrintOptions) {
  try {
    localStorage.setItem(CARD_OPT_KEY, JSON.stringify(opts));
  } catch {
    /* ignore */
  }
}

/** ثيم مخصص افتراضي. */
export const CUSTOM_THEME: CardTheme = {
  id: "__custom__",
  name: "مخصص",
  c1: "#6366f1",
  c2: "#8b5cf6",
  text: "#ffffff",
};

/** تحويل بروفايل Supabase إلى ثيم. */
export function profileToTheme(p: CardProfileRow): CardTheme {
  return {
    id: p.id,
    name: p.name,
    c1: p.bg_color1,
    c2: p.bg_color2,
    text: p.text_color,
  };
}

/**
 * بناء overrides للخيارات من بروفايل محفوظ (مثل المرجع):
 * ألوان الهيدر/الفوتر تحترم أعلام التفعيل، وsafeMargin لا يتأثر (عالمي).
 */
export function profileToOverrides(
  p: CardProfileRow
): Partial<CardPrintOptions> {
  const ov: Partial<CardPrintOptions> = {};
  const hasHeaderEnabled = p.header_color_enabled !== undefined && p.header_color_enabled !== null;
  const hasFooterEnabled = p.footer_color_enabled !== undefined && p.footer_color_enabled !== null;
  if (p.header_color != null) {
    ov.headerColor = hasHeaderEnabled
      ? p.header_color_enabled
        ? p.header_color || ""
        : ""
      : p.header_color || "";
  }
  if (p.footer_color != null) {
    ov.footerColor = hasFooterEnabled
      ? p.footer_color_enabled
        ? p.footer_color || ""
        : ""
      : p.footer_color || "";
  }
  if (p.header_text_color != null) ov.headerTextColor = p.header_text_color || "";
  if (p.footer_text_color != null) ov.footerTextColor = p.footer_text_color || "";
  if (p.print_mode) ov.mode = p.print_mode;
  if (p.show_front_header != null) ov.frontHeader = !!p.show_front_header;
  if (p.show_front_name != null) ov.frontName = !!p.show_front_name;
  if (p.show_front_qr != null) ov.frontQR = !!p.show_front_qr;
  if (p.show_front_photo != null) ov.frontPhoto = !!p.show_front_photo;
  if (p.show_front_footer != null) ov.frontFooter = !!p.show_front_footer;
  if (p.show_front_id != null) ov.frontId = !!p.show_front_id;
  if (p.show_back_logo != null) ov.backLogo = !!p.show_back_logo;
  if (p.show_back_service_name != null)
    ov.backServiceName = !!p.show_back_service_name;
  if (p.use_logo_instead_of_photo != null)
    ov.useLogoInsteadOfPhoto = !!p.use_logo_instead_of_photo;
  return ov;
}

/** أيقونات جاهزة لاختيارها عند حفظ بروفايل جديد (lucide names). */
export const PROFILE_ICONS = [
  "id-card",
  "star",
  "gem",
  "crown",
  "leaf",
  "flame",
  "moon",
  "sun",
  "heart",
  "zap",
  "bookmark",
  "trophy",
  "cross",
  "church",
  "feather",
  "cloud",
  "snowflake",
  "anchor",
  "rocket",
  "flag",
  "tag",
  "palette",
  "wand",
  "shield",
  "medal",
] as const;
