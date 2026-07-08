import {
  Trophy,
  Award,
  Star,
  Medal,
  Crown,
  Sparkles,
  Heart,
  BookOpen,
  Flame,
  Lock,
  LucideIcon,
} from "lucide-react";
import { getMemberSession } from "@/lib/member/server";
import { getMemberAchievements } from "@/lib/member/portal";
import { PageHero, Card } from "@/components/ui/page-card";

export const dynamic = "force-dynamic";

// نفس مفاتيح الأيقونات المستخدمة في صفحة الخادم (achievements)
const ICONS: Record<string, LucideIcon> = {
  trophy: Trophy,
  award: Award,
  star: Star,
  medal: Medal,
  crown: Crown,
  sparkles: Sparkles,
  heart: Heart,
  book: BookOpen,
  flame: Flame,
};

const DATE_FMT = new Intl.DateTimeFormat("ar-EG", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/**
 * صفحة الإنجازات — تعرض ما منحه الخادم للمخدوم فور منحه (نفس جداول
 * صفحة الخادم عبر RPC)، مع باقي الإنجازات المتاحة كتحفيز.
 */
export default async function MemberAchievementsPage() {
  const session = (await getMemberSession())!;
  const achievements = await getMemberAchievements(session.code);

  const earned = achievements.filter((a) => a.earned);
  const locked = achievements.filter((a) => !a.earned);

  return (
    <div>
      <PageHero
        title="الإنجازات"
        subtitle="إنجازاتك التي حصلت عليها من الخدمة"
        icon={Trophy}
        grad="grad-amber"
      />

      {/* ملخص */}
      <div className="mb-3 grid grid-cols-2 gap-3">
        <Card className="text-center">
          <p className="text-2xl font-bold text-ink">{earned.length}</p>
          <p className="text-xs font-semibold text-ink-muted">إنجاز حصلت عليه</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-ink">{achievements.length}</p>
          <p className="text-xs font-semibold text-ink-muted">إجمالي الإنجازات</p>
        </Card>
      </div>

      {achievements.length === 0 ? (
        <Card className="py-10 text-center">
          <Trophy className="mx-auto mb-2 h-10 w-10 text-ink-muted" />
          <p className="text-sm font-semibold text-ink">لا توجد إنجازات معرَّفة بعد</p>
          <p className="mt-1 text-xs text-ink-muted">ترقّب إنجازات جديدة من الخدمة قريباً</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* إنجازاتي */}
          {earned.length > 0 && (
            <Card>
              <p className="mb-3 text-xs font-bold text-ink-muted">🏆 إنجازاتي</p>
              <ul className="space-y-2">
                {earned.map((a) => {
                  const Icon = ICONS[a.icon] ?? Trophy;
                  return (
                    <li
                      key={a.id}
                      className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-3"
                    >
                      <span
                        className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white shadow-soft"
                        style={{ background: `linear-gradient(115deg, ${a.color}, ${a.color}cc)` }}
                      >
                        <Icon className="h-6 w-6" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-ink">{a.name}</span>
                        {a.description && (
                          <span className="block truncate text-xs text-ink-muted">
                            {a.description}
                          </span>
                        )}
                        {a.awarded_at && (
                          <span className="block text-[11px] text-ink-muted">
                            حصلت عليه في {DATE_FMT.format(new Date(a.awarded_at))}
                          </span>
                        )}
                      </span>
                      {a.points > 0 && (
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                          +{a.points} نقطة
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          {/* إنجازات لم تُحقَّق بعد — تحفيز */}
          {locked.length > 0 && (
            <Card>
              <p className="mb-3 text-xs font-bold text-ink-muted">
                🔒 إنجازات يمكنك تحقيقها
              </p>
              <ul className="space-y-2">
                {locked.map((a) => {
                  const Icon = ICONS[a.icon] ?? Trophy;
                  return (
                    <li
                      key={a.id}
                      className="flex items-center gap-3 rounded-2xl border border-white/40 bg-surface-muted p-3 opacity-80"
                    >
                      <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-surface text-ink-muted shadow-soft">
                        <Icon className="h-6 w-6" />
                        <span className="absolute -bottom-1 -left-1 grid h-5 w-5 place-items-center rounded-full bg-ink/70 text-white">
                          <Lock className="h-3 w-3" />
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-ink">{a.name}</span>
                        {a.description && (
                          <span className="block truncate text-xs text-ink-muted">
                            {a.description}
                          </span>
                        )}
                      </span>
                      {a.points > 0 && (
                        <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold text-ink-muted">
                          +{a.points} نقطة
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
