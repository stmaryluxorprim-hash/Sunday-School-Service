import { Star, TrendingUp, TrendingDown } from "lucide-react";
import { getMemberSession } from "@/lib/member/server";
import { getMemberPoints, getMemberProfile } from "@/lib/member/portal";
import { PageHero, Card } from "@/components/ui/page-card";

export const dynamic = "force-dynamic";

const WHEN_FMT = new Intl.DateTimeFormat("ar-EG", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** صفحة النقاط — الرصيد الحالي + سجل الإضافات والخصومات. */
export default async function MemberPointsPage() {
  const session = (await getMemberSession())!;
  const [profile, entries] = await Promise.all([
    getMemberProfile(session.code),
    getMemberPoints(session.code),
  ]);

  const added = entries
    .filter((e) => Number(e.amount) > 0)
    .reduce((s, e) => s + Number(e.amount), 0);
  const deducted = entries
    .filter((e) => Number(e.amount) < 0)
    .reduce((s, e) => s + Math.abs(Number(e.amount)), 0);

  return (
    <div>
      <PageHero
        title="النقاط"
        subtitle="رصيدك وسجل العمليات"
        icon={Star}
        grad="grad-amber"
      />

      {/* Balance */}
      <Card className="mb-3 text-center">
        <p className="text-xs font-semibold text-ink-muted">رصيدك الحالي</p>
        <p className="text-4xl font-bold text-ink" dir="ltr">
          {Number(profile?.opening_balance ?? 0).toLocaleString("ar-EG")}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-primary-soft p-2.5">
            <p className="flex items-center justify-center gap-1 text-xs font-bold text-primary">
              <TrendingUp className="h-3.5 w-3.5" />
              إجمالي الإضافات
            </p>
            <p className="text-lg font-bold text-primary" dir="ltr">
              +{added.toLocaleString("ar-EG")}
            </p>
          </div>
          <div className="rounded-2xl bg-accent-soft p-2.5">
            <p className="flex items-center justify-center gap-1 text-xs font-bold text-accent">
              <TrendingDown className="h-3.5 w-3.5" />
              إجمالي الخصومات
            </p>
            <p className="text-lg font-bold text-accent" dir="ltr">
              -{deducted.toLocaleString("ar-EG")}
            </p>
          </div>
        </div>
      </Card>

      {/* Log */}
      <Card>
        <p className="mb-3 text-xs font-bold text-ink-muted">سجل النقاط (الأحدث أولاً)</p>
        {entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-muted">
            لا توجد عمليات نقاط بعد.
          </p>
        ) : (
          <ul className="space-y-2">
            {entries.map((e) => {
              const amt = Number(e.amount);
              const positive = amt > 0;
              return (
                <li
                  key={e.id}
                  className="flex items-center gap-3 rounded-2xl border border-white/40 bg-surface-muted p-3"
                >
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white shadow-soft ${
                      positive ? "grad-green" : "grad-accent"
                    }`}
                  >
                    {positive ? (
                      <TrendingUp className="h-5 w-5" />
                    ) : (
                      <TrendingDown className="h-5 w-5" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-ink">
                      {e.reason || (positive ? "إضافة نقاط" : "خصم نقاط")}
                    </span>
                    <span className="block text-xs text-ink-muted">
                      {WHEN_FMT.format(new Date(e.created_at))}
                    </span>
                  </span>
                  <span
                    className={`text-sm font-bold ${positive ? "text-green-600" : "text-accent"}`}
                    dir="ltr"
                  >
                    {positive ? "+" : ""}
                    {amt.toLocaleString("ar-EG")}
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
