import { BarChart3 } from "lucide-react";
import { PageHero, Card, ComingSoon } from "@/components/ui/page-card";

export default function StatsPage() {
  return (
    <div>
      <PageHero title="الاحصائيات" subtitle="تقارير ورسوم بيانية" icon={BarChart3} />

      <div className="mb-3 grid grid-cols-2 gap-3">
        <Card className="text-center">
          <p className="text-2xl font-bold text-gradient">—</p>
          <p className="text-xs text-ink-muted">متوسط الحضور</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-gradient">—</p>
          <p className="text-xs text-ink-muted">أعلى حضور</p>
        </Card>
      </div>

      <ComingSoon note="سنضيف رسوماً بيانية تفاعلية لمعدلات الحضور والنمو عبر الزمن." />
    </div>
  );
}
