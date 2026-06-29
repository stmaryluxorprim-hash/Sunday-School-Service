"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/config/navigation";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-md px-3 pb-2">
        <div className="glass flex items-center justify-between rounded-3xl px-2 py-1.5 shadow-card border border-white/30">
          {NAV_ITEMS.map((item) => {
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
                  className={`grid h-9 w-9 place-items-center rounded-2xl transition ${
                    active ? "btn-gradient text-white shadow-soft" : "text-ink-muted"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span
                  className={`text-[10px] font-semibold transition ${
                    active ? "text-primary" : "text-ink-muted"
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
