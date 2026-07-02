"use client";

import { Menu, CalendarDays, Church, MessageCircle, Bell } from "lucide-react";
import { useSettings } from "@/context/settings-context";

type HeaderProps = {
  onMenuClick: () => void;
  onDateClick: () => void;
  onMessagesClick: () => void;
  onNotificationsClick: () => void;
  unreadCount?: number;
  selectedDate: string; // already formatted in Arabic
};

export function Header({
  onMenuClick,
  onDateClick,
  onMessagesClick,
  onNotificationsClick,
  unreadCount = 0,
  selectedDate,
}: HeaderProps) {
  const { branding } = useSettings();

  return (
    <header className="w-full">
      <div className="glass border-b border-white/20 px-4 pt-[calc(env(safe-area-inset-top)+0.6rem)] pb-3">
        <div className="flex items-center justify-between gap-3">
          {/* Right side (RTL start): icon + name + slogan */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl btn-gradient shadow-soft overflow-hidden">
              {branding.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={branding.logoUrl}
                  alt="icon"
                  className="h-full w-full object-cover"
                />
              ) : (
                <Church className="h-6 w-6 text-white" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold leading-tight text-ink">
                {branding.serviceName}
              </h1>
              <p className="truncate text-xs text-ink-muted">{branding.slogan}</p>
            </div>
          </div>

          {/* Left side (RTL end): notifications + messages + date + menu */}
          <div className="flex items-center gap-2">
            <button
              onClick={onNotificationsClick}
              className="relative grid h-10 w-10 place-items-center rounded-2xl bg-surface text-primary shadow-card active:scale-95 transition"
              aria-label="الإشعارات"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -left-1 grid min-w-[1.15rem] h-[1.15rem] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={onMessagesClick}
              className="grid h-10 w-10 place-items-center rounded-2xl bg-surface text-primary shadow-card active:scale-95 transition"
              aria-label="الرسائل"
            >
              <MessageCircle className="h-5 w-5" />
            </button>
            <button
              onClick={onDateClick}
              className="flex items-center gap-1.5 rounded-2xl bg-primary-soft/70 px-3 py-2 text-xs font-semibold text-primary active:scale-95 transition"
              aria-label="اختيار التاريخ"
            >
              <CalendarDays className="h-4 w-4" />
              <span className="hidden xs:inline sm:inline">{selectedDate}</span>
            </button>
            <button
              onClick={onMenuClick}
              className="grid h-10 w-10 place-items-center rounded-2xl bg-surface text-ink shadow-card active:scale-95 transition"
              aria-label="القائمة"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
