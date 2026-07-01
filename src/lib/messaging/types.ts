/** أنواع نظام الرسائل الداخلي. */

export type ConversationRow = {
  id: string;
  title: string | null;
  member_id: string | null;
  created_by: string | null;
  last_message: string | null;
  last_at: string;
  created_at?: string;
  updated_at?: string;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  sender_name: string | null;
  body: string;
  created_at: string;
};

/** تنسيق وقت عربي مختصر لعرض الرسائل/المحادثات. */
export function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return "";
  }
}

/** تنسيق تاريخ/وقت مختصر لقائمة المحادثات. */
export function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return formatTime(iso);
    return new Intl.DateTimeFormat("ar-EG", {
      day: "numeric",
      month: "short",
    }).format(d);
  } catch {
    return "";
  }
}
