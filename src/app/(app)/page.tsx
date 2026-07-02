"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { Home, Users, CalendarCheck, TrendingUp, Plus, ScanLine } from "lucide-react";
import { PageHero, Card } from "@/components/ui/page-card";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useSelectedDate } from "@/context/selected-date-context";
import { SendNotificationBox } from "@/components/notifications/send-box";

export default function HomePage() {
  const { date } = useSelectedDate();
  const [totalMembers, setTotalMembers] = useState<number | null>(null);
  const [presentToday, setPresentToday] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    const [{ count }, { data: aData }] = await Promise.all([
      supabase.from("members").select("id", { count: "exact", head: true }),
      supabase.from("attendance_log").select("member_id").eq("attended_on", date),
    ]);
    setTotalMembers(count ?? 0);
    setPresentToday((aData ?? []).length);
  }, [date]);

  useEffect(() => {
    load();
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    const channel = supabase
      .channel("home_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "members" }, () =>
        load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendance_log" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const rate =
    totalMembers && totalMembers > 0 && presentToday != null
      ? `${Math.round((presentToday / totalMembers) * 100)}%`
      : "—";

  const stats = [
    {
      label: "إجمالي المخدومين",
      value: totalMembers ?? "—",
      icon: Users,
      color: "text-primary",
    },
    {
      label: "حضور اليوم",
      value: presentToday ?? "—",
      icon: CalendarCheck,
      color: "text-accent",
    },
    { label: "نسبة الحضور", value: rate, icon: TrendingUp, color: "text-secondary" },
  ];

  return (
    <div>
      <PageHero title="الرئيسية" subtitle="نظرة عامة على الخدمة" icon={Home} />

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
        <SendNotificationBox />

        <Card>
          <h3 className="mb-1 font-bold text-ink">أهلاً بك 👋</h3>
          <p className="text-sm text-ink-muted">
            هذه هي الصفحة الرئيسية. تعرض ملخصاً سريعاً عن الخدمة، ويمكنك الانتقال
            بسرعة إلى المهام الأكثر استخداماً.
          </p>
        </Card>

        <Card>
          <h3 className="mb-2 font-bold text-ink">اختصارات سريعة</h3>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/scanner"
              className="flex items-center gap-2 rounded-2xl bg-primary-soft/60 p-3 text-sm font-semibold text-primary active:scale-95"
            >
              <ScanLine className="h-5 w-5" /> تسجيل حضور
            </Link>
            <Link
              href="/data/add"
              className="flex items-center gap-2 rounded-2xl bg-accent-soft/60 p-3 text-sm font-semibold text-accent active:scale-95"
            >
              <Plus className="h-5 w-5" /> إضافة مخدوم
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
