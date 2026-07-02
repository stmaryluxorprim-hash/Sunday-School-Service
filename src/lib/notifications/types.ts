/** أنواع نظام الإشعارات العامة. */

export type NotificationRow = {
  id: string;
  body: string;
  sender_id: string | null;
  sender_name: string | null;
  created_at: string;
};

/** إشعار مع حالة القراءة للمستخدم الحالي. */
export type NotificationWithRead = NotificationRow & {
  read: boolean;
};

/** تنسيق تاريخ/وقت مختصر بالعربية لعرض الإشعارات. */
export function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) {
      return new Intl.DateTimeFormat("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    }
    return new Intl.DateTimeFormat("ar-EG", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return "";
  }
}
