import { createClient } from "@/lib/supabase/client";

/** المفتاح العام VAPID (آمن للعرض في المتصفح). */
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

/** هل إشعارات الويب مدعومة على هذا الجهاز/المتصفح؟ */
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** الحالة الحالية لإذن الإشعارات. */
export function notificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/** تحويل مفتاح VAPID من base64url إلى Uint8Array (مطلوب لـ subscribe). */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}

/** تسجيل الـ Service Worker (مرة واحدة). */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

/**
 * طلب إذن الإشعارات ثم الاشتراك في Web Push وحفظ الاشتراك في Supabase.
 * يعيد true عند النجاح.
 */
export async function enablePushNotifications(): Promise<boolean> {
  if (!isPushSupported() || !VAPID_PUBLIC_KEY) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const registration = await navigator.serviceWorker.ready;

  // إعادة استخدام الاشتراك القائم أو إنشاء جديد.
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    });
  }

  return saveSubscription(subscription);
}

/**
 * طلب إذن الإشعارات تلقائياً عند فتح التطبيق (بدون زر).
 *  - لا يفعل شيئاً إذا سبق رفض الإذن (نحترم قرار المستخدم ولا نزعجه).
 *  - إذا كان الإذن ممنوحاً بالفعل: يتأكد فقط من وجود اشتراك محفوظ.
 *  - إذا كان الإذن "default": يطلبه مرة واحدة فقط لكل جهاز (عبر localStorage).
 * يعيد true عندما يكون الجهاز مشتركاً بنجاح.
 */
export async function autoEnablePush(): Promise<boolean> {
  if (!isPushSupported() || !VAPID_PUBLIC_KEY) return false;

  const perm = Notification.permission;

  // المستخدم رفض سابقاً — لا نعيد الطلب (المتصفح يمنعه على أي حال).
  if (perm === "denied") return false;

  // ممنوح بالفعل — تأكد فقط من حفظ الاشتراك.
  if (perm === "granted") return enablePushNotifications();

  // perm === "default": اطلب الإذن تلقائياً مرة واحدة فقط لكل جهاز.
  try {
    if (
      typeof localStorage !== "undefined" &&
      localStorage.getItem("push_auto_asked") === "1"
    ) {
      return false;
    }
    localStorage.setItem("push_auto_asked", "1");
  } catch {
    /* localStorage غير متاح — تابع الطلب على أي حال */
  }

  return enablePushNotifications();
}

// ---------------------------------------------------------------------
// App icon badge (فقاعة على أيقونة التطبيق مثل واتساب) — Badging API
// ---------------------------------------------------------------------

type BadgeNavigator = Navigator & {
  setAppBadge?: (count?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

/** هل تدعم المنصّة فقاعة الأيقونة (Badging API)؟ */
export function isBadgingSupported(): boolean {
  return (
    typeof navigator !== "undefined" && "setAppBadge" in (navigator as BadgeNavigator)
  );
}

/**
 * تحديث فقاعة أيقونة التطبيق برقم غير المقروء (مثل واتساب).
 * count = 0 يمسح الفقاعة. تظهر على التطبيق المثبّت (PWA) على المنصّات الداعمة.
 */
export async function updateAppBadge(count: number): Promise<void> {
  const nav = navigator as BadgeNavigator;
  try {
    if (count > 0) {
      await nav.setAppBadge?.(count);
    } else {
      await nav.clearAppBadge?.();
    }
  } catch {
    /* تجاهل — غير مدعوم أو رُفض */
  }
}

/** حفظ اشتراك الجهاز في جدول push_subscriptions. */
async function saveSubscription(subscription: PushSubscription): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const json = subscription.toJSON();
  const keys = json.keys ?? {};

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: keys.p256dh ?? "",
      auth: keys.auth ?? "",
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    },
    { onConflict: "endpoint" }
  );
  return !error;
}
