import Link from "next/link";
import {
  CalendarCheck,
  Star,
  UserRound,
  MessageCircle,
  Bell,
  ChevronLeft,
  Sparkles,
} from "lucide-react";
import { getMemberSession } from "@/lib/member/server";
import {
  getMemberProfile,
  getMemberNotifications,
} from "@/lib/member/portal";
import { Card } from "@/components/ui/page-card";

export const dynamic = "force-dynamic";

/** الرئيسية — ملخص سريع: الحضور، النقاط، وآخر الإشعارات. */
export default async function MemberHomePage() {
  const session = (await getMemberSession())!;
  const [profile, notifications] = await Promise.all([
    getMemberProfile(session.code),
    getMemberNotifications(session.code),
  ]);

  const unread = notifications.filter((n) => !n.is_read).length;

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
          <div className="min-w-0">
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
        </div>
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/member/attendance">
          <Card className="h-full">
            <div className="mb-2 grid h-10 w-10 place-items-center rounded-2xl grad-teal text-white shadow-soft">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-ink">
              {profile?.attendance_count ?? 0}
            </p>
            <p className="text-xs font-semibold text-ink-muted">مرة حضور</p>
          </Card>
        </Link>
        <Link href="/member/points">
          <Card className="h-full">
            <div className="mb-2 grid h-10 w-10 place-items-center rounded-2xl grad-amber text-white shadow-soft">
              <Star className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-ink" dir="ltr">
              {Number(profile?.opening_balance ?? 0).toLocaleString("ar-EG")}
            </p>
            <p className="text-xs font-semibold text-ink-muted">رصيد النقاط</p>
          </Card>
        </Link>
      </div>

      {/* Shortcuts */}
      <Card>
        <p className="mb-3 text-xs font-bold text-ink-muted">الوصول السريع</p>
        <div className="space-y-2">
          <Shortcut
            href="/member/data"
            icon={<UserRound className="h-5 w-5" />}
            grad="grad-violet"
            title="بياناتي"
            note="عرض بيانات العضوية والكارت"
          />
          <Shortcut
            href="/member/messages"
            icon={<MessageCircle className="h-5 w-5" />}
            grad="grad-green"
            title="الرسائل"
            note="تواصل مع الخدّام مباشرة"
          />
          <Shortcut
            href="/member/notifications"
            icon={<Bell className="h-5 w-5" />}
            grad="grad-accent"
            title="الإشعارات"
            note={unread > 0 ? `${unread} إشعار غير مقروء` : "لا جديد الآن"}
            badge={unread}
          />
        </div>
      </Card>
    </div>
  );
}

function Shortcut({
  href,
  icon,
  grad,
  title,
  note,
  badge,
}: {
  href: string;
  icon: React.ReactNode;
  grad: string;
  title: string;
  note: string;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl border border-white/40 bg-surface-muted p-3 transition active:scale-[0.98]"
    >
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white shadow-soft ${grad}`}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-ink">{title}</span>
        <span className="block truncate text-xs text-ink-muted">{note}</span>
      </span>
      {badge && badge > 0 ? (
        <span className="grid h-6 min-w-6 place-items-center rounded-full bg-accent px-1.5 text-xs font-bold text-white">
          {badge}
        </span>
      ) : null}
      <ChevronLeft className="h-4 w-4 text-ink-muted" />
    </Link>
  );
}
