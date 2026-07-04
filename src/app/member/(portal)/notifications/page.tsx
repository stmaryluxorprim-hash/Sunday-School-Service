import { Bell, CheckCheck } from "lucide-react";
import { getMemberSession } from "@/lib/member/server";
import { getMemberNotifications } from "@/lib/member/portal";
import { PageHero, Card } from "@/components/ui/page-card";
import { markAllReadAction } from "./actions";

export const dynamic = "force-dynamic";

const WHEN_FMT = new Intl.DateTimeFormat("ar-EG", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** صفحة الإشعارات — إشعارات الخدمة العامة مع حالة القراءة لكل مخدوم. */
export default async function MemberNotificationsPage() {
  const session = (await getMemberSession())!;
  const notifications = await getMemberNotifications(session.code);
  const unread = notifications.filter((n) => !n.is_read).length;

  return (
    <div>
      <PageHero
        title="الإشعارات"
        subtitle={unread > 0 ? `${unread} إشعار غير مقروء` : "كل الإشعارات مقروءة"}
        icon={Bell}
        grad="grad-accent"
      />

      {unread > 0 && (
        <form action={markAllReadAction} className="mb-3">
          <button className="flex w-full items-center justify-center gap-2 rounded-2xl border border-primary-soft bg-surface py-2.5 text-sm font-bold text-primary shadow-soft transition active:scale-95">
            <CheckCheck className="h-4 w-4" />
            تعليم الكل كمقروء
          </button>
        </form>
      )}

      <Card>
        {notifications.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-muted">
            لا توجد إشعارات بعد.
          </p>
        ) : (
          <ul className="space-y-2">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`rounded-2xl border p-3 ${
                  n.is_read
                    ? "border-white/40 bg-surface-muted"
                    : "border-primary-soft bg-primary-soft/40"
                }`}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-ink-muted">
                    {n.sender_name || "الخدمة"}
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] text-ink-muted">
                    {!n.is_read && (
                      <span className="h-2 w-2 rounded-full bg-accent" />
                    )}
                    {WHEN_FMT.format(new Date(n.created_at))}
                  </span>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm font-semibold text-ink">
                  {n.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
