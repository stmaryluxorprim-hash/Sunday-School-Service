"use client";

import { useState, useMemo, useEffect, useCallback, ReactNode } from "react";
import { Header } from "./header";
import { Drawer } from "./drawer";
import { Sidebar } from "./sidebar";
import { DateSheet } from "./date-sheet";
import { BottomNav } from "./bottom-nav";
import { MessagingApp } from "@/components/messaging/messaging-app";
import { NotificationsPanel } from "@/components/notifications/notifications-panel";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { listNotifications } from "@/lib/notifications/operations";
import {
  registerServiceWorker,
  autoEnablePush,
  updateAppBadge,
} from "@/lib/notifications/push";
import {
  SelectedDateProvider,
  useSelectedDate,
} from "@/context/selected-date-context";

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

export type UserProfile = { id?: string; name: string; email: string } | null;

function Shell({
  children,
  profile,
}: {
  children: ReactNode;
  profile: UserProfile;
}) {
  const { date, setDate } = useSelectedDate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const arabicDate = useMemo(() => formatArabicDate(date), [date]);

  // تسجيل الـ Service Worker + طلب إذن الإشعارات تلقائياً عند فتح التطبيق.
  useEffect(() => {
    (async () => {
      await registerServiceWorker();
      // يطلب الإذن تلقائياً (مرة واحدة لكل جهاز) بدلاً من الضغط على زر.
      await autoEnablePush();
    })();
  }, []);

  // حساب عدد الإشعارات غير المقروءة + متابعتها فورياً.
  const refreshUnread = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const data = await listNotifications();
    const unread = data.filter((n) => !n.read).length;
    setUnreadCount(unread);
    // فقاعة أيقونة التطبيق (مثل واتساب) تعكس عدد غير المقروء.
    updateAppBadge(unread);
  }, []);

  useEffect(() => {
    refreshUnread();
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    const channel = supabase
      .channel("shell_notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => refreshUnread()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notification_reads" },
        () => refreshUnread()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshUnread]);

  return (
    <div className="bg-aurora min-h-screen">
      {/* الشريط الجانبي — واجهة الكمبيوتر فقط (lg+) */}
      <Sidebar
        profile={profile}
        onOpenMessages={() => setMessagesOpen(true)}
      />

      {/* المحتوى: عمود موبايل ضيّق — وعلى الشاشات الكبيرة مساحة واسعة بجانب السايدبار */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col lg:me-0 lg:ms-72 lg:max-w-none">
        {/* الهيدر ثابت أعلى الشاشة ولا يتحرّك مع المحتوى */}
        <div className="fixed inset-x-0 top-0 z-30 mx-auto max-w-md lg:ms-72 lg:max-w-none">
          <Header
            onMenuClick={() => setMenuOpen(true)}
            onDateClick={() => setDateOpen(true)}
            onMessagesClick={() => setMessagesOpen(true)}
            onNotificationsClick={() => setNotificationsOpen(true)}
            unreadCount={unreadCount}
            selectedDate={arabicDate}
          />
        </div>

        {/* حشوة علوية بمقدار ارتفاع الهيدر حتى لا يختفي المحتوى تحته */}
        <main className="flex-1 px-4 pb-28 pt-[calc(env(safe-area-inset-top)+5.25rem)] lg:px-8 lg:pb-10 lg:pt-[calc(env(safe-area-inset-top)+5.5rem)]">
          <div className="lg:mx-auto lg:max-w-6xl">{children}</div>
        </main>

        <BottomNav />
        <Drawer
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          profile={profile}
          onOpenMessages={() => {
            setMenuOpen(false);
            setMessagesOpen(true);
          }}
        />
        <DateSheet
          open={dateOpen}
          onClose={() => setDateOpen(false)}
          value={date}
          onChange={setDate}
        />
        <MessagingApp
          open={messagesOpen}
          onClose={() => setMessagesOpen(false)}
          profile={profile}
        />
        <NotificationsPanel
          open={notificationsOpen}
          onClose={() => {
            setNotificationsOpen(false);
            refreshUnread();
          }}
        />
      </div>
    </div>
  );
}

export function AppShell({
  children,
  profile = null,
}: {
  children: ReactNode;
  profile?: UserProfile;
}) {
  return (
    <SelectedDateProvider>
      <Shell profile={profile}>{children}</Shell>
    </SelectedDateProvider>
  );
}
