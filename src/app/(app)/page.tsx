import { Home, Users, CalendarCheck, TrendingUp } from "lucide-react";
import { PageHero, Card } from "@/components/ui/page-card";

const stats = [
  { label: "إجمالي المخدومين", value: "—", icon: Users, color: "text-primary" },
  { label: "حضور اليوم", value: "—", icon: CalendarCheck, color: "text-accent" },
  { label: "نسبة الحضور", value: "—", icon: TrendingUp, color: "text-secondary" },
];

export default function HomePage() {
  return (
    <div>
      <PageHero
        title="الرئيسية"
        subtitle="نظرة عامة على الخدمة"
        icon={Home}
      />

      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="flex flex-col items-center gap-1 text-center">
              <Icon className={`h-6 w-6 ${s.color}`} />
              <span className="text-lg font-bold text-ink">{s.value}</span>
              <span className="text-[10px] leading-tight text-ink-muted">{s.label}</span>
            </Card>
          );
        })}
      </div>

      <div className="mt-4 space-y-3">
        <Card>
          <h3 className="mb-1 font-bold text-ink">أهلاً بك 👋</h3>
          <p className="text-sm text-ink-muted">
            هذه هي الصفحة الرئيسية. سنضيف هنا ملخص اجتماع اليوم، أحدث الأنشطة،
            والتنبيهات المهمة في الخطوات القادمة.
          </p>
        </Card>

        <Card>
          <h3 className="mb-2 font-bold text-ink">اختصارات سريعة</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-primary-soft/60 p-3 text-sm font-semibold text-primary">
              تسجيل حضور
            </div>
            <div className="rounded-2xl bg-accent-soft/60 p-3 text-sm font-semibold text-accent">
              إضافة مخدوم
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
