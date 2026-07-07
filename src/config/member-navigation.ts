import {
  Home,
  CalendarCheck,
  Star,
  UserRound,
  MessageCircle,
  Bell,
  ShoppingBag,
  LucideIcon,
} from "lucide-react";

/**
 * صفحات بوابة المخدوم — قابلة للتوسعة (أضف عنصراً هنا وصفحة جديدة
 * تحت src/app/member/(portal)/ وستظهر تلقائياً في التنقّل).
 */
export type MemberNavItem = {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  grad: string;
  text: string;
};

export const MEMBER_NAV_ITEMS: MemberNavItem[] = [
  { key: "home", label: "الرئيسية", href: "/member", icon: Home, grad: "grad-primary", text: "text-primary" },
  { key: "attendance", label: "الحضور", href: "/member/attendance", icon: CalendarCheck, grad: "grad-teal", text: "text-teal-600" },
  { key: "points", label: "النقاط", href: "/member/points", icon: Star, grad: "grad-amber", text: "text-amber-600" },
  { key: "purchases", label: "مشترياتي", href: "/member/purchases", icon: ShoppingBag, grad: "grad-green", text: "text-green-600" },
  { key: "data", label: "بياناتي", href: "/member/data", icon: UserRound, grad: "grad-violet", text: "text-violet-600" },
  { key: "messages", label: "الرسائل", href: "/member/messages", icon: MessageCircle, grad: "grad-green", text: "text-green-600" },
];

/** صفحة الإشعارات — تُفتح من جرس الهيدر (ليست في الشريط السفلي). */
export const MEMBER_NOTIFICATIONS_ITEM: MemberNavItem = {
  key: "notifications",
  label: "الإشعارات",
  href: "/member/notifications",
  icon: Bell,
  grad: "grad-accent",
  text: "text-accent",
};
