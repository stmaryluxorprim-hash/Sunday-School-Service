"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Church, Bell, LogOut } from "lucide-react";
import { useSettings } from "@/context/settings-context";
import {
  MEMBER_NAV_ITEMS,
  MEMBER_NOTIFICATIONS_ITEM,
} from "@/config/member-navigation";
import { memberSignOut } from "@/app/member/login/actions";

/**
 * هيكل بوابة المخدوم — هيدر ثابت (شعار + اسم المخدوم + جرس الإشعارات +
 * خروج) وشريط تنقّل سفلي لصفحات البوابة.
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

          {/* Sign out */}
          <form action={memberSignOut}>
            <button
              aria-label="تسجيل الخروج"
              className="grid h-10 w-10 place-items-center rounded-2xl bg-surface text-ink-muted shadow-soft transition active:scale-95"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </form>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-4 pb-28 pt-[76px]">{children}</main>

      {/* Bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 glass border-t border-white/30 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-3xl items-stretch justify-around px-2 py-1.5">
          {MEMBER_NAV_ITEMS.map((item) => {
            const active =
              item.href === "/member"
                ? pathname === "/member"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                className="flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 transition active:scale-95"
              >
                <span
                  className={`grid h-9 w-14 place-items-center rounded-2xl transition ${
                    active ? `${item.grad} text-white shadow-soft` : "text-ink-muted"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span
                  className={`text-[11px] font-bold ${
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
