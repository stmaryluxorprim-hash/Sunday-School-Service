"use client";

import { useState } from "react";
import { Send, BellRing, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/page-card";
import { sendNotification } from "@/lib/notifications/operations";
import {
  enablePushNotifications,
  isPushSupported,
  notificationPermission,
} from "@/lib/notifications/push";

/** صندوق إرسال إشعار عام لكل المستخدمين. */
export function SendNotificationBox() {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [enabling, setEnabling] = useState(false);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">(
    typeof window !== "undefined" ? notificationPermission() : "default"
  );

  async function handleSend() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setStatus(null);
    const ok = await sendNotification(body);
    setSending(false);
    if (ok) {
      setText("");
      setStatus({ ok: true, msg: "تم إرسال الإشعار لكل المستخدمين ✅" });
    } else {
      setStatus({ ok: false, msg: "تعذّر الإرسال، حاول مرة أخرى." });
    }
  }

  async function handleEnable() {
    setEnabling(true);
    const ok = await enablePushNotifications();
    setEnabling(false);
    setPerm(notificationPermission());
    if (!ok) {
      setStatus({
        ok: false,
        msg: "تعذّر تفعيل إشعارات الجهاز (تحقق من الأذونات).",
      });
    }
  }

  const showEnable =
    isPushSupported() && perm !== "granted" && perm !== "unsupported";

  return (
    <Card>
      <h3 className="mb-2 flex items-center gap-2 font-bold text-ink">
        <BellRing className="h-5 w-5 text-primary" />
        إرسال إشعار للجميع
      </h3>
      <p className="mb-3 text-xs text-ink-muted">
        اكتب رسالة وستصل كإشعار على أجهزة كل المستخدمين وتبقى في لوحة الإشعارات حتى
        تُقرأ.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="اكتب الإشعار هنا…"
        rows={3}
        className="w-full resize-none rounded-2xl border border-white/40 bg-surface px-4 py-3 text-sm text-ink shadow-inner outline-none placeholder:text-ink-muted focus:ring-2 focus:ring-primary/40"
      />

      <button
        onClick={handleSend}
        disabled={sending || !text.trim()}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl btn-gradient px-4 py-3 text-sm font-semibold text-white shadow-soft transition active:scale-95 disabled:opacity-50"
      >
        {sending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Send className="h-5 w-5" />
        )}
        {sending ? "جارٍ الإرسال…" : "إرسال للجميع"}
      </button>

      {showEnable && (
        <button
          onClick={handleEnable}
          disabled={enabling}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-soft/70 px-4 py-2.5 text-xs font-semibold text-primary transition active:scale-95 disabled:opacity-50"
        >
          {enabling ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <BellRing className="h-4 w-4" />
          )}
          تفعيل إشعارات الجهاز على هذا الجهاز
        </button>
      )}

      {status && (
        <p
          className={`mt-2 text-center text-xs font-semibold ${
            status.ok ? "text-emerald-600" : "text-rose-600"
          }`}
        >
          {status.msg}
        </p>
      )}
    </Card>
  );
}
