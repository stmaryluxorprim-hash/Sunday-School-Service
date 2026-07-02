import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type PushRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

/**
 * POST /api/notifications/send
 * body: { body: string }
 *
 * 1) يتحقق من المستخدم المسجّل.
 * 2) يُنشئ صف الإشعار (يظهر داخل التطبيق فوراً عبر Realtime).
 * 3) يبث Web Push لكل الأجهزة المشتركة (إشعار على مستوى الجهاز).
 */
export async function POST(req: NextRequest) {
  const { body } = await req.json().catch(() => ({ body: "" }));
  const text = typeof body === "string" ? body.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "النص فارغ" }, { status: 400 });
  }

  // 1) المستخدم الحالي
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }

  const senderName =
    (user.user_metadata?.name as string) || user.email || "مستخدم";

  // 2) إنشاء صف الإشعار (RLS يسمح لأي مستخدم مسجّل)
  const { data: notif, error: insertErr } = await supabase
    .from("notifications")
    .insert({ body: text, sender_id: user.id, sender_name: senderName })
    .select("*")
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // 3) بث Web Push لكل الأجهزة (يتطلب مفاتيح VAPID + service role)
  const admin = createAdminClient();
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

  let pushSent = 0;
  const pushConfigured = !!(admin && vapidPublic && vapidPrivate);

  if (pushConfigured) {
    webpush.setVapidDetails(vapidSubject, vapidPublic!, vapidPrivate!);

    const { data: subs } = await admin!
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth");

    const payload = JSON.stringify({
      title: senderName,
      body: text,
      url: "/",
      tag: notif.id,
    });

    const staleIds: string[] = [];

    await Promise.all(
      ((subs as PushRow[]) ?? []).map(async (s) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: s.endpoint,
              keys: { p256dh: s.p256dh, auth: s.auth },
            },
            payload
          );
          pushSent += 1;
        } catch (err: unknown) {
          // 404/410 => الاشتراك لم يعُد صالحاً؛ احذفه.
          const statusCode =
            typeof err === "object" && err && "statusCode" in err
              ? (err as { statusCode?: number }).statusCode
              : undefined;
          if (statusCode === 404 || statusCode === 410) staleIds.push(s.id);
        }
      })
    );

    if (staleIds.length > 0) {
      await admin!.from("push_subscriptions").delete().in("id", staleIds);
    }
  }

  return NextResponse.json({
    ok: true,
    notification: notif,
    pushSent,
    pushConfigured,
  });
}
