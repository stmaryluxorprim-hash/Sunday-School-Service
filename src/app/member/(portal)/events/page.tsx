import {
  Megaphone,
  CalendarDays,
  MapPin,
  Clock,
  PartyPopper,
} from "lucide-react";
import { getMemberSession } from "@/lib/member/server";
import { getMemberEvents } from "@/lib/member/portal";
import { PageHero, Card } from "@/components/ui/page-card";

export const dynamic = "force-dynamic";

const DATE_FMT = new Intl.DateTimeFormat("ar-EG", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return DATE_FMT.format(new Date(iso + "T00:00:00"));
  } catch {
    return iso;
  }
}

/**
 * صفحة الإعلانات والفعاليات — تعرض ما ينشره الخادم من صفحته فوراً
 * (نفس جدول events عبر RPC البوابة).
 */
export default async function MemberEventsPage() {
  const session = (await getMemberSession())!;
  const events = await getMemberEvents(session.code);

  const announcements = events.filter((e) => e.kind === "announcement");
  const activities = events.filter((e) => e.kind !== "announcement");

  return (
    <div>
      <PageHero
        title="الإعلانات والفعاليات"
        subtitle="كل جديد الخدمة يصلك هنا أولاً"
        icon={Megaphone}
        grad="grad-accent"
      />

      <div className="mb-3 grid grid-cols-2 gap-3">
        <Card className="text-center">
          <p className="text-2xl font-bold text-ink">{announcements.length}</p>
          <p className="text-xs font-semibold text-ink-muted">إعلان</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-ink">{activities.length}</p>
          <p className="text-xs font-semibold text-ink-muted">فعالية</p>
        </Card>
      </div>

      {events.length === 0 ? (
        <Card className="py-10 text-center">
          <Megaphone className="mx-auto mb-2 h-10 w-10 text-ink-muted" />
          <p className="text-sm font-semibold text-ink">لا توجد إعلانات بعد</p>
          <p className="mt-1 text-xs text-ink-muted">
            سيظهر هنا كل ما ينشره الخدّام من إعلانات وفعاليات
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {events.map((e) => {
            const isEvent = e.kind !== "announcement";
            return (
              <Card key={e.id} className="card-topline">
                <div className="flex items-start gap-3">
                  <span
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white shadow-soft ${
                      isEvent ? "grad-violet" : "grad-accent"
                    }`}
                  >
                    {isEvent ? (
                      <PartyPopper className="h-5 w-5" />
                    ) : (
                      <Megaphone className="h-5 w-5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="min-w-0 flex-1 truncate text-sm font-bold text-ink">
                        {e.title}
                      </h3>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isEvent
                            ? "bg-violet-100 text-violet-700"
                            : "bg-accent-soft text-accent"
                        }`}
                      >
                        {isEvent ? "فعالية" : "إعلان"}
                      </span>
                    </div>
                    {e.description && (
                      <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-ink-muted">
                        {e.description}
                      </p>
                    )}
                    {(e.event_date || e.event_time || e.location) && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {e.event_date && (
                          <span className="flex items-center gap-1 rounded-full bg-surface-muted px-2 py-1 text-[11px] font-semibold text-ink">
                            <CalendarDays className="h-3.5 w-3.5 text-primary" />
                            {formatDate(e.event_date)}
                          </span>
                        )}
                        {e.event_time && (
                          <span className="flex items-center gap-1 rounded-full bg-surface-muted px-2 py-1 text-[11px] font-semibold text-ink">
                            <Clock className="h-3.5 w-3.5 text-primary" />
                            {e.event_time}
                          </span>
                        )}
                        {e.location && (
                          <span className="flex items-center gap-1 rounded-full bg-surface-muted px-2 py-1 text-[11px] font-semibold text-ink">
                            <MapPin className="h-3.5 w-3.5 text-primary" />
                            {e.location}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
