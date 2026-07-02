import { createClient } from "@/lib/supabase/client";
import { NotificationRow, NotificationWithRead } from "@/lib/notifications/types";

/**
 * جلب كل الإشعارات مرتّبة من الأحدث، مع تحديد المقروء منها للمستخدم الحالي.
 */
export async function listNotifications(): Promise<NotificationWithRead[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: notifs }, { data: reads }] = await Promise.all([
    supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    user
      ? supabase
          .from("notification_reads")
          .select("notification_id")
          .eq("user_id", user.id)
      : Promise.resolve({ data: [] as { notification_id: string }[] }),
  ]);

  const readSet = new Set(
    ((reads as { notification_id: string }[]) ?? []).map((r) => r.notification_id)
  );

  return ((notifs as NotificationRow[]) ?? []).map((n) => ({
    ...n,
    read: readSet.has(n.id),
  }));
}

/** إرسال إشعار عام لكل المستخدمين (يُنشئ الصف + يبث Web Push عبر الـ API). */
export async function sendNotification(body: string): Promise<boolean> {
  const text = body.trim();
  if (!text) return false;

  const res = await fetch("/api/notifications/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body: text }),
  });
  return res.ok;
}

/** تعليم إشعار كمقروء للمستخدم الحالي. */
export async function markRead(notificationId: string): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("notification_reads")
    .upsert(
      { notification_id: notificationId, user_id: user.id },
      { onConflict: "notification_id,user_id" }
    );
  return !error;
}

/** تعليم كل الإشعارات كمقروءة للمستخدم الحالي. */
export async function markAllRead(ids: string[]): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || ids.length === 0) return false;

  const rows = ids.map((id) => ({ notification_id: id, user_id: user.id }));
  const { error } = await supabase
    .from("notification_reads")
    .upsert(rows, { onConflict: "notification_id,user_id" });
  return !error;
}
