"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, X, Check, CheckCheck, Loader2 } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  listNotifications,
  markAllRead,
  markRead,
} from "@/lib/notifications/operations";
import { NotificationWithRead, formatWhen } from "@/lib/notifications/types";

export function NotificationsPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [items, setItems] = useState<NotificationWithRead[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    const data = await listNotifications();
    setItems(data);
    setLoading(false);
  }, []);

  // تحميل عند الفتح + الاشتراك في التحديثات الفورية.
  useEffect(() => {
    if (!open) return;
    load();
  }, [open, load]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    const channel = supabase
      .channel("notifications_panel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notification_reads" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  async function handleMarkRead(id: string) {
    // تحديث فوري متفائل
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await markRead(id);
  }

  async function handleMarkAll() {
    const unreadIds = items.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    await markAllRead(unreadIds);
  }

  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <>
      {/* الخلفية */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* اللوحة (تنزلق من الأعلى) */}
      <aside
        className={`fixed inset-x-0 top-0 z-50 mx-auto flex max-h-[85vh] max-w-md flex-col rounded-b-3xl bg-surface shadow-2xl transition-transform ${
          open ? "translate-y-0" : "-translate-y-full"
        }`}
        dir="rtl"
      >
        <div className="flex items-center justify-between gap-2 border-b border-black/5 px-4 pt-[calc(env(safe-area-inset-top)+0.9rem)] pb-3">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-2xl btn-gradient text-white shadow-soft">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight text-ink">الإشعارات</h2>
              <p className="text-xs text-ink-muted">
                {unreadCount > 0 ? `${unreadCount} غير مقروء` : "لا جديد"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                className="flex items-center gap-1 rounded-xl bg-primary-soft/70 px-2.5 py-2 text-xs font-semibold text-primary active:scale-95"
              >
                <CheckCheck className="h-4 w-4" /> تعليم الكل
              </button>
            )}
            <button
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-2xl bg-black/5 text-ink active:scale-95"
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {loading && items.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-ink-muted">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-sm text-ink-muted">
              <Bell className="mx-auto mb-2 h-8 w-8 opacity-40" />
              لا توجد إشعارات بعد.
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={`rounded-2xl border p-3 transition ${
                    n.read
                      ? "border-black/5 bg-surface"
                      : "border-primary/20 bg-primary-soft/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {!n.read && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                        )}
                        <span className="truncate text-xs font-semibold text-ink">
                          {n.sender_name || "إشعار"}
                        </span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink">
                        {n.body}
                      </p>
                      <span className="mt-1 block text-[10px] text-ink-muted">
                        {formatWhen(n.created_at)}
                      </span>
                    </div>
                    {!n.read && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary active:scale-95"
                        aria-label="تعليم كمقروء"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
