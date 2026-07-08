"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Church, Bell, LogOut, Menu, X, Sparkles } from "lucide-react";
import { useSettings } from "@/context/settings-context";
import {
  MEMBER_NAV_ITEMS,
  MEMBER_EXTRA_ITEMS,
  MEMBER_NOTIFICATIONS_ITEM,
  type MemberNavItem,
} from "@/config/member-navigation";
import { memberSignOut } from "@/app/member/login/actions";

/**
 * هيكل بوابة المخدوم — هيدر ثابت (شعار + اسم المخدوم + جرس الإشعارات +
 * زر القائمة الجانبية) وشريط تنقّل سفلي لصفحات البوابة الستة.
 * القائمة الجانبية تعرض الصفحات الستة + الوظائف الإضافية + زر الخروج.
 */
export function MemberShell({
  memberName,
  children,
}: {
  memberName: string;
  children: React.ReactNode;
}) {
  const { branding } = useSettings();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // أغلق القائمة تلقائياً عند تغيّر المسار
  useEffect(() => setDrawerOpen(false), [pathname]);

  const isActive = (item: MemberNavItem) =>
    item.href === "/member" ? pathname === "/member" : pathname.startsWith(item.href);

  return (
    <div className="bg-aurora min-h-screen">
      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-40 glass border-b border-white/30">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl btn-gradient shadow-soft">
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logoUrl} alt="logo" className="h-full w-full object-cover" />
            ) : (
              <Church className="h-5 w-5 text-white" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-ink">{branding.serviceName}</p>
            <p className="truncate text-xs text-ink-muted">أهلاً، {memberName}</p>
          </div>

          {/* Notifications bell */}
          <Link
            href={MEMBER_NOTIFICATIONS_ITEM.href}
            aria-label="الإشعارات"
            className={`grid h-10 w-10 place-items-center rounded-2xl transition active:scale-95 ${
              pathname === MEMBER_NOTIFICATIONS_ITEM.href
                ? "btn-gradient text-white shadow-soft"
                : "bg-surface text-ink-muted shadow-soft"
            }`}
          >
            <Bell className="h-5 w-5" />
          </Link>

          {/* Menu (drawer) button */}
          <button
            aria-label="القائمة"
            onClick={() => setDrawerOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-2xl bg-surface text-ink-muted shadow-soft transition active:scale-95"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Drawer overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          drawerOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setDrawerOpen(false)}
      />

      {/* Drawer panel — ينزلق من اليمين (بداية RTL) */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-[82%] max-w-xs flex-col bg-surface shadow-2xl transition-transform duration-300 ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* رأس القائمة */}
        <div className="bg-aurora flex shrink-0 items-center justify-between gap-3 p-5 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
          <div className="relative z-10 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl btn-gradient shadow-soft">
              {branding.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={branding.logoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Church className="h-6 w-6 text-white" />
              )}
            </div>
            <div>
              <p className="font-bold text-ink">{branding.serviceName}</p>
              <p className="text-xs text-ink-muted">أهلاً، {memberName}</p>
            </div>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="relative z-10 grid h-9 w-9 place-items-center rounded-xl bg-surface/70 text-ink active:scale-95"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* الروابط */}
        <nav className="mt-3 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain px-3 pb-4">
          {MEMBER_NAV_ITEMS.map((item) => (
            <DrawerLink key={item.key} item={item} active={isActive(item)} />
          ))}

          {/* وظائف إضافية */}
          <p className="mt-3 flex items-center gap-1.5 px-3 text-[11px] font-bold text-ink-muted">
            <Sparkles className="h-3.5 w-3.5" />
            وظائف إضافية
          </p>
          {MEMBER_EXTRA_ITEMS.map((item) => (
            <DrawerLink key={item.key} item={item} active={isActive(item)} />
          ))}

          {/* الإشعارات */}
          <DrawerLink
            item={MEMBER_NOTIFICATIONS_ITEM}
            active={pathname.startsWith(MEMBER_NOTIFICATIONS_ITEM.href)}
          />
        </nav>

        {/* الخروج — ثابت أسفل اللوحة */}
        <div className="shrink-0 border-t border-white/30 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <form action={memberSignOut}>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent-soft py-3 text-sm font-bold text-accent transition active:scale-95"
            >
              <LogOut className="h-5 w-5" />
              تسجيل الخروج
            </button>
          </form>
        </div>
      </aside>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-4 pb-28 pt-[76px]">{children}</main>

      {/* Bottom navigation — الصفحات الستة */}
      <nav className="fixed inset-x-0 bottom-0 z-40 glass border-t border-white/30 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-3xl items-stretch justify-around px-1 py-1.5">
          {MEMBER_NAV_ITEMS.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                className="flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 transition active:scale-95"
              >
                <span
                  className={`grid h-9 w-12 place-items-center rounded-2xl transition ${
                    active ? `${item.grad} text-white shadow-soft` : "text-ink-muted"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span
                  className={`text-[10px] font-bold ${
                    active ? item.text : "text-ink-muted"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

/** رابط داخل القائمة الجانبية — أيقونة بتدرّج + الاسم + وصف مختصر. */
function DrawerLink({ item, active }: { item: MemberNavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition active:scale-[0.98] ${
        active ? `bg-surface-muted ${item.text}` : "text-ink hover:bg-surface-muted"
      }`}
    >
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
          active ? `${item.grad} text-white shadow-soft` : "bg-surface-muted text-ink-muted"
        }`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{item.label}</span>
        <span className="block truncate text-[11px] font-normal text-ink-muted">
          {item.note}
        </span>
      </span>
    </Link>
  );
}
