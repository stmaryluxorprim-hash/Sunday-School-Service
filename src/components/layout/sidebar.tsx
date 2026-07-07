"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, UserCircle2, Church } from "lucide-react";
import { NAV_ITEMS } from "@/config/navigation";
import { useSettings } from "@/context/settings-context";
import { signOut } from "@/app/login/actions";

/**
 * الشريط الجانبي الثابت — واجهة الكمبيوتر (يظهر فقط على الشاشات الكبيرة lg+).
 * يعرض الهوية + التنقّل + المستخدم الحالي + تسجيل الخروج.
 */
export function Sidebar({
  profile,
}: {
  profile?: { id?: string; name: string; email: string } | null;
}) {
  const pathname = usePathname();
  const { branding } = useSettings();

  return (
    <aside className="fixed inset-y-0 start-0 z-30 hidden w-72 flex-col border-e border-white/30 bg-surface/85 backdrop-blur-xl lg:flex">
      {/* الهوية */}
      <div className="card-topline flex items-center gap-3 p-5">
        <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl btn-gradient shadow-soft">
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Church className="h-6 w-6 text-white" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-bold text-ink">{branding.serviceName}</p>
          <p className="truncate text-xs text-ink-muted">{branding.slogan}</p>
        </div>
      </div>

      {/* التنقّل */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {NAV_ITEMS.filter((i) => !i.sideOnly).map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                active
                  ? "bg-surface-muted " + item.text
                  : "text-ink hover:bg-surface-muted/70"
              }`}
            >
              <span
                className={`grid h-9 w-9 place-items-center rounded-lg ${
                  active ? `${item.grad} shadow-soft` : "bg-surface-muted text-ink-muted"
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              {item.label}
            </Link>
          );
        })}

        {/* أدوات إضافية — من القائمة الجانبية فقط */}
        <p className="mt-3 px-3 text-[11px] font-bold text-ink-muted">أدوات إضافية</p>
        {NAV_ITEMS.filter((i) => i.sideOnly).map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                active
                  ? "bg-surface-muted " + item.text
                  : "text-ink hover:bg-surface-muted/70"
              }`}
            >
              <span
                className={`grid h-9 w-9 place-items-center rounded-lg ${
                  active ? `${item.grad} shadow-soft` : "bg-surface-muted text-ink-muted"
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              {item.label}
            </Link>
          );
        })}

      </nav>

      {/* المستخدم الحالي + خروج */}
      <div className="border-t border-white/30 p-4">
        <div className="mb-3 flex items-center gap-3 rounded-lg bg-surface-muted p-3">
          <UserCircle2 className="h-9 w-9 text-primary" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">
              {profile?.name ?? "مستخدم"}
            </p>
            <p className="truncate text-xs text-ink-muted" dir="ltr">
              {profile?.email ?? ""}
            </p>
          </div>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent-soft py-2.5 text-sm font-bold text-accent transition hover:brightness-95 active:scale-95"
          >
            <LogOut className="h-5 w-5" />
            تسجيل الخروج
          </button>
        </form>
      </div>
    </aside>
  );
}
