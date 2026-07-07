import {
  Home,
  Database,
  ScanLine,
  BarChart3,
  Printer,
  Settings,
  Trophy,
  Megaphone,
  Send,
  Cake,
  MessageCircle,
  Store,
  LucideIcon,
} from "lucide-react";

/**
 * The main pages. Each item can later be gated by an RBAC permission key,
 * so a Profile/role only sees the pages it is allowed to access.
 */
export type NavItem = {
  key: string;
  label: string; // Arabic
  href: string;
  icon: LucideIcon;
  permission: string; // RBAC permission key (used in a later step)
  /** تدرّج لوني مميّز لكل صفحة (كلاس CSS من globals.css). */
  grad: string;
  /** لون نص مميّز عند التفعيل. */
  text: string;
  /**
   * صفحات تُفتح من القائمة الجانبية فقط —
   * لا تظهر في شريط التنقّل السفلي (الموبايل).
   */
  sideOnly?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { key: "home", label: "الرئيسية", href: "/", icon: Home, permission: "page.home.view", grad: "grad-primary", text: "text-primary" },
  { key: "data", label: "البيانات", href: "/data", icon: Database, permission: "page.data.view", grad: "grad-teal", text: "text-teal-600" },
  { key: "scanner", label: "الماسح", href: "/scanner", icon: ScanLine, permission: "page.scanner.view", grad: "grad-violet", text: "text-violet-600" },
  { key: "stats", label: "الاحصائيات", href: "/stats", icon: BarChart3, permission: "page.stats.view", grad: "grad-amber", text: "text-amber-600" },
  { key: "settings", label: "الإعدادات", href: "/settings", icon: Settings, permission: "page.settings.view", grad: "grad-accent", text: "text-accent" },

  // ---- صفحات القائمة الجانبية فقط (لا تظهر في الشريط السفلي) ----
  { key: "messages", label: "الرسائل الداخلية", href: "/messages", icon: MessageCircle, permission: "page.messages.view", grad: "grad-primary", text: "text-primary", sideOnly: true },
  { key: "print", label: "الطباعة", href: "/print", icon: Printer, permission: "page.print.view", grad: "grad-green", text: "text-green-600", sideOnly: true },
  { key: "store", label: "المتجر", href: "/store", icon: Store, permission: "page.store.view", grad: "grad-green", text: "text-green-600", sideOnly: true },
  { key: "achievements", label: "الإنجازات", href: "/achievements", icon: Trophy, permission: "page.achievements.view", grad: "grad-amber", text: "text-amber-600", sideOnly: true },
  { key: "events", label: "الإعلانات والفعاليات", href: "/events", icon: Megaphone, permission: "page.events.view", grad: "grad-violet", text: "text-violet-600", sideOnly: true },
  { key: "messenger", label: "الرسائل الجماعية", href: "/messenger", icon: Send, permission: "page.messenger.view", grad: "grad-teal", text: "text-teal-600", sideOnly: true },
  { key: "birthdays", label: "أعياد الميلاد", href: "/birthdays", icon: Cake, permission: "page.birthdays.view", grad: "grad-accent", text: "text-accent", sideOnly: true },
];

/** عناصر الشريط السفلي (الموبايل) — الصفحات الرئيسية فقط. */
export const BOTTOM_NAV_ITEMS: NavItem[] = NAV_ITEMS.filter((i) => !i.sideOnly);
