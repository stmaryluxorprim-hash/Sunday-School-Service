"use client";

import { useState, useMemo, ReactNode } from "react";
import { Header } from "./header";
import { Drawer } from "./drawer";
import { DateSheet } from "./date-sheet";
import { BottomNav } from "./bottom-nav";

function formatArabicDate(iso: string): string {
  try {
    const d = new Date(iso + "T00:00:00");
    return new Intl.DateTimeFormat("ar-EG", {
      day: "numeric",
      month: "short",
    }).format(d);
  } catch {
    return iso;
  }
}

export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const arabicDate = useMemo(() => formatArabicDate(date), [date]);

  return (
    <div className="bg-aurora min-h-screen">
      <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col">
        <Header
          onMenuClick={() => setMenuOpen(true)}
          onDateClick={() => setDateOpen(true)}
          selectedDate={arabicDate}
        />

        <main className="flex-1 px-4 pb-28 pt-4">{children}</main>

        <BottomNav />
        <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} />
        <DateSheet
          open={dateOpen}
          onClose={() => setDateOpen(false)}
          value={date}
          onChange={setDate}
        />
      </div>
    </div>
  );
}
