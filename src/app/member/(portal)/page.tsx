import Link from "next/link";
import {
  CalendarCheck,
  Star,
  UserRound,
  MessageCircle,
  Bell,
  ChevronLeft,
  Sparkles,
  Trophy,
  Megaphone,
  ShoppingBag,
  LucideIcon,
} from "lucide-react";
import { getMemberSession } from "@/lib/member/server";
import {
  getMemberProfile,
  getMemberNotifications,
  getMemberAchievements,
  getMemberEvents,
  getMemberInvoices,
  getMemberMessages,
} from "@/lib/member/portal";
import { Card } from "@/components/ui/page-card";

export const dynamic = "force-dynamic";

const DATE_FMT = new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "long" });

/**
 * الرئيسية — كارت مختصر لكل وظيفة (البيانات · الحضور · النقاط ·
 * الإنجازات · الإعلانات · الرسائل · مشترياتي) بملخص حيّ من نفس بيانات
 * صفحة الخادم، والضغط على أي كارت يفتح صفحته.
 */
export default async function MemberHomePage() {
  const session = (await getMemberSession())!;
  const [profile, notifications, achievements, events, invoices, messages] =
    await Promise.all([
      getMemberProfile(session.code),
      getMemberNotifications(session.code),
      getMemberAchievements(session.code),
      getMemberEvents(session.code),
      getMemberInvoices(session.code),
      getMemberMessages(session.code),
    ]);

  const unread = notifications.filter((n) => !n.is_read).length;
  const earned = achievements.filter((a) => a.earned);
  const latestEvent = events[0];
  const latestInvoice = invoices[0];
  const lastMessage = messages[messages.length - 1];

  const points = Number(profile?.opening_balance ?? 0).toLocaleString("ar-EG");
  const attendance = profile?.attendance_count ?? 0;

  return (
    <div className="space-y-3">
      {/* Welcome hero */}
      <Card className="card-topline pt-5">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl btn-gradient shadow-soft">
            {profile?.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.photo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <Sparkles className="h-8 w-8 text-white" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-ink-muted">أهلاً بك 👋</p>
            <h2 className="truncate text-lg font-bold text-ink">
              {profile?.name ?? session.name}
            </h2>
            {profile?.class_name && (
              <p className="text-xs font-semibold text-primary">
                فصل: {profile.class_name}
              </p>
            )}
          </div>
          {unread > 0 && (
            <Link
              href="/member/notifications"
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-bold text-accent active:scale-95"
            >
              <Bell className="h-4 w-4" />
              {unread}
            </Link>
          )}
        </div>
      </Card>

      {/* كروت الوظائف — كارت لكل وظيفة بملخص حيّ */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FeatureCard
          href="/member/data"
          icon={UserRound}
          grad="grad-violet"
          title="البيانات"
          desc="بيانات عضويتك وكارت الدخول (QR)"
          stat={profile?.code ?? "—"}
          statLabel="كود العضوية"
        />
        <FeatureCard
          href="/member/attendance"
          icon={CalendarCheck}
          grad="grad-teal"
          title="الحضور"
          desc="سجل حضورك بالكامل بالتواريخ"
          stat={String(attendance)}
          statLabel="مرة حضور"
        />
        <FeatureCard
          href="/member/points"
          icon={Star}
          grad="grad-amber"
          title="النقاط"
          desc="رصيدك الحالي وسجل الإضافة والخصم"
          stat={points}
          statLabel="نقطة في رصيدك"
        />
        <FeatureCard
          href="/member/achievements"
          icon={Trophy}
          grad="grad-green"
          title="الإنجازات"
          desc={
            earned.length > 0
              ? `آخر إنجاز: ${earned[0].name}`
              : "إنجازاتك التي تمنحها لك الخدمة"
          }
          stat={`${earned.length} / ${achievements.length}`}
          statLabel="إنجاز محقَّق"
        />
        <FeatureCard
          href="/member/events"
          icon={Megaphone}
          grad="grad-accent"
          title="الإعلانات"
          desc={
            latestEvent
              ? `آخر ${latestEvent.kind === "announcement" ? "إعلان" : "فعالية"}: ${latestEvent.title}`
              : "الإعلانات والفعاليات القادمة من الخدمة"
          }
          stat={String(events.length)}
          statLabel="إعلان وفعالية"
        />
        <FeatureCard
          href="/member/messages"
          icon={MessageCircle}
          grad="grad-green"
          title="الرسائل"
          desc={
            lastMessage
              ? `آخر رسالة: ${lastMessage.body.slice(0, 40)}${lastMessage.body.length > 40 ? "…" : ""}`
              : "تواصل مع الخدّام مباشرة"
          }
          stat={String(messages.length)}
          statLabel="رسالة في المحادثة"
        />
        <FeatureCard
          href="/member/purchases"
          icon={ShoppingBag}
          grad="grad-amber"
          title="مشترياتي"
          desc={
            latestInvoice
              ? `آخر فاتورة #${latestInvoice.invoice_no} — ${DATE_FMT.format(new Date(latestInvoice.created_at))}`
              : "فواتير مشترياتك من متجر الخدمة"
          }
          stat={String(invoices.length)}
          statLabel="فاتورة"
        />
        <FeatureCard
          href="/member/notifications"
          icon={Bell}
          grad="grad-accent"
          title="الإشعارات"
          desc={unread > 0 ? `لديك ${unread} إشعار غير مقروء` : "لا جديد الآن — كله مقروء"}
          stat={String(notifications.length)}
          statLabel="إشعار"
          badge={unread}
        />
      </div>
    </div>
  );
}

/** كارت وظيفة — أيقونة + اسم + وصف مختصر + رقم حيّ، يفتح صفحة الوظيفة. */
function FeatureCard({
  href,
  icon: Icon,
  grad,
  title,
  desc,
  stat,
  statLabel,
  badge,
}: {
  href: string;
  icon: LucideIcon;
  grad: string;
  title: string;
  desc: string;
  stat: string;
  statLabel: string;
  badge?: number;
}) {
  return (
    <Link href={href} className="block">
      <Card className="h-full transition active:scale-[0.98]">
        <div className="flex items-start gap-3">
          <span
            className={`relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white shadow-soft ${grad}`}
          >
            <Icon className="h-6 w-6" />
            {badge && badge > 0 ? (
              <span className="absolute -left-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-white shadow-soft">
                {badge}
              </span>
            ) : null}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1">
              <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">
                {title}
              </span>
              <ChevronLeft className="h-4 w-4 shrink-0 text-ink-muted" />
            </span>
            <span className="mt-0.5 block truncate text-xs text-ink-muted">{desc}</span>
            <span className="mt-2 flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-ink" dir="ltr">
                {stat}
              </span>
              <span className="text-[11px] font-semibold text-ink-muted">{statLabel}</span>
            </span>
          </span>
        </div>
      </Card>
    </Link>
  );
}
