"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, LogOut, UserCircle2, Church } from "lucide-react";
import { NAV_ITEMS } from "@/config/navigation";
import { useSettings } from "@/context/settings-context";
import { signOut } from "@/app/login/actions";

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  profile?: { name: string; email: string } | null;
};

export function Drawer({ open, onClose, profile = null }: DrawerProps) {
  const pathname = usePathname();
  const { branding } = useSettings();

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Panel (slides from the RTL start = right) */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-[82%] max-w-xs bg-surface shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="bg-aurora flex items-center justify-between gap-3 p-5 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
          <div className="relative z-10 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl btn-gradient shadow-soft overflow-hidden">
              {branding.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={branding.logoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Church className="h-6 w-6 text-white" />
              )}
            </div>
            <div>
              <p className="font-bold text-ink">{branding.serviceName}</p>
              <p className="text-xs text-ink-muted">{branding.slogan}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="relative z-10 grid h-9 w-9 place-items-center rounded-xl bg-surface/70 text-ink active:scale-95"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current user */}
        <div className="mx-4 mt-4 flex items-center gap-3 rounded-2xl bg-surface-muted p-3">
          <UserCircle2 className="h-10 w-10 text-primary" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">
              {profile?.name ?? "مستخدم"}
            </p>
            <p className="truncate text-xs text-ink-muted" dir="ltr">
              {profile?.email ?? ""}
            </p>
          </div>
        </div>

        {/* Links */}
        <nav className="mt-4 flex flex-col gap-1 px-3">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition active:scale-[0.98] ${
                  active
                    ? "bg-primary-soft text-primary"
                    : "text-ink hover:bg-surface-muted"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="absolute inset-x-0 bottom-0 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent-soft py-3 text-sm font-bold text-accent active:scale-95 transition"
            >
              <LogOut className="h-5 w-5" />
              تسجيل الخروج
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
