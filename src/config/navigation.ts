import { Home, Database, ScanLine, BarChart3, Settings, LucideIcon } from "lucide-react";

/**
 * The five main pages. Each item can later be gated by an RBAC permission key,
 * so a Profile/role only sees the pages it is allowed to access.
 */
export type NavItem = {
  key: string;
  label: string; // Arabic
  href: string;
  icon: LucideIcon;
  permission: string; // RBAC permission key (used in a later step)
};

export const NAV_ITEMS: NavItem[] = [
  { key: "home", label: "الرئيسية", href: "/", icon: Home, permission: "page.home.view" },
  { key: "data", label: "البيانات", href: "/data", icon: Database, permission: "page.data.view" },
  { key: "scanner", label: "الماسح", href: "/scanner", icon: ScanLine, permission: "page.scanner.view" },
  { key: "stats", label: "الاحصائيات", href: "/stats", icon: BarChart3, permission: "page.stats.view" },
  { key: "settings", label: "الإعدادات", href: "/settings", icon: Settings, permission: "page.settings.view" },
];
