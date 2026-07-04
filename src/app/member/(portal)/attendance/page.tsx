import { CalendarCheck, CalendarDays } from "lucide-react";
import { getMemberSession } from "@/lib/member/server";
import { getMemberAttendance, getMemberProfile } from "@/lib/member/portal";
import { PageHero, Card } from "@/components/ui/page-card";

export const dynamic = "force-dynamic";

const WEEKDAY_FMT = new Intl.DateTimeFormat("ar-EG", { weekday: "long" });
const DATE_FMT = new Intl.DateTimeFormat("ar-EG", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** صفحة الحضور — إجمالي مرات الحضور + سجل كامل بالتواريخ. */
export default async function MemberAttendancePage() {
  const session = (await getMemberSession())!;
  const [profile, entries] = await Promise.all([
    getMemberProfile(session.code),
    getMemberAttendance(session.code),
  ]);

  // حضور آخر 30 يوماً
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const last30 = entries.filter((e) => new Date(e.attended_on) >= cutoff).length;

  return (
    <div>
      <PageHero
        title="الحضور"
        subtitle="سجل حضورك بالكامل"
        icon={CalendarCheck}
        grad="grad-teal"
      />

      <div className="mb-3 grid grid-cols-2 gap-3">
        <Card className="text-center">
          <p className="text-2xl font-bold text-ink">
            {profile?.attendance_count ?? entries.length}
          </p>
          <p className="text-xs font-semibold text-ink-muted">إجمالي مرات الحضور</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-ink">{last30}</p>
          <p className="text-xs font-semibold text-ink-muted">آخر 30 يوماً</p>
        </Card>
      </div>

      <Card>
        <p className="mb-3 text-xs font-bold text-ink-muted">سجل الحضور (الأحدث أولاً)</p>
        {entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-muted">
            لا يوجد حضور مسجَّل بعد.
          </p>
        ) : (
          <ul className="space-y-2">
            {entries.map((e) => {
              const d = new Date(e.attended_on + "T00:00:00");
              return (
                <li
                  key={e.id}
                  className="flex items-center gap-3 rounded-2xl border border-white/40 bg-surface-muted p-3"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl grad-teal text-white shadow-soft">
                    <CalendarDays className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-ink">
                      {WEEKDAY_FMT.format(d)}
                    </span>
                    <span className="block text-xs text-ink-muted">
                      {DATE_FMT.format(d)}
                    </span>
                  </span>
                  <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-bold text-primary">
                    حضر ✓
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
