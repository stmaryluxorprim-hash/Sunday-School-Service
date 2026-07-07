"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BOTTOM_NAV_ITEMS } from "@/config/navigation";

/** شريط التنقّل السفلي — للموبايل فقط (يختفي على الشاشات الكبيرة).
 *  يعرض الصفحات الرئيسية فقط — صفحات القائمة الجانبية (sideOnly) لا تظهر هنا. */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="mx-auto max-w-md px-3 pb-2">
        <div className="glass flex items-center justify-between rounded-2xl px-2 py-1.5 shadow-card border border-white/30">
          {BOTTOM_NAV_ITEMS.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                className="relative flex flex-1 flex-col items-center gap-1 py-2 transition active:scale-95"
              >
                <span
                  className={`grid h-9 w-9 place-items-center rounded-lg transition ${
                    active ? `${item.grad} shadow-soft` : "text-ink-muted"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span
                  className={`text-[10px] font-semibold transition ${
                    active ? item.text : "text-ink-muted"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
