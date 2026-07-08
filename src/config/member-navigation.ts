import {
  Home,
  CalendarCheck,
  Star,
  UserRound,
  MessageCircle,
  Bell,
  ShoppingBag,
  Trophy,
  Megaphone,
  LucideIcon,
} from "lucide-react";

/**
 * صفحات بوابة المخدوم — قابلة للتوسعة (أضف عنصراً هنا وصفحة جديدة
 * تحت src/app/member/(portal)/ وستظهر تلقائياً في التنقّل).
 *
 * - `MEMBER_NAV_ITEMS`   : الأيقونات الستة في الشريط السفلي (وتظهر أيضاً
 *   في القائمة الجانبية).
 * - `MEMBER_EXTRA_ITEMS` : وظائف إضافية تُفتح من القائمة الجانبية فقط.
 */
export type MemberNavItem = {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  grad: string;
  text: string;
  /** وصف مختصر يظهر في كارت الصفحة الرئيسية والقائمة الجانبية. */
  note: string;
};

/** الشريط السفلي — الرئيسية · البيانات · الحضور · النقاط · الإنجازات · الإعلانات */
export const MEMBER_NAV_ITEMS: MemberNavItem[] = [
  { key: "home", label: "الرئيسية", href: "/member", icon: Home, grad: "grad-primary", text: "text-primary", note: "ملخص سريع لكل شيء" },
  { key: "data", label: "البيانات", href: "/member/data", icon: UserRound, grad: "grad-violet", text: "text-violet-600", note: "بيانات العضوية والكارت" },
  { key: "attendance", label: "الحضور", href: "/member/attendance", icon: CalendarCheck, grad: "grad-teal", text: "text-teal-600", note: "سجل حضورك بالكامل" },
  { key: "points", label: "النقاط", href: "/member/points", icon: Star, grad: "grad-amber", text: "text-amber-600", note: "رصيدك وسجل النقاط" },
  { key: "achievements", label: "الإنجازات", href: "/member/achievements", icon: Trophy, grad: "grad-green", text: "text-green-600", note: "الإنجازات التي حصلت عليها" },
  { key: "events", label: "الإعلانات", href: "/member/events", icon: Megaphone, grad: "grad-accent", text: "text-accent", note: "الإعلانات والفعاليات القادمة" },
];

/** وظائف إضافية — تُفتح من القائمة الجانبية فقط (أضف هنا مستقبلاً). */
export const MEMBER_EXTRA_ITEMS: MemberNavItem[] = [
  { key: "messages", label: "الرسائل", href: "/member/messages", icon: MessageCircle, grad: "grad-green", text: "text-green-600", note: "تواصل مع الخدّام مباشرة" },
  { key: "purchases", label: "مشترياتي", href: "/member/purchases", icon: ShoppingBag, grad: "grad-amber", text: "text-amber-600", note: "فواتير مشترياتك من المتجر" },
];

/** صفحة الإشعارات — تُفتح من جرس الهيدر (ليست في الشريط السفلي). */
export const MEMBER_NOTIFICATIONS_ITEM: MemberNavItem = {
  key: "notifications",
  label: "الإشعارات",
  href: "/member/notifications",
  icon: Bell,
  grad: "grad-accent",
  text: "text-accent",
  note: "آخر الإشعارات المرسلة إليك",
};
