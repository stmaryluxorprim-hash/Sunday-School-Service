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
      grad: "grad-primary",
    },
    {
      label: "حضور اليوم",
      value: presentToday ?? "—",
      icon: CalendarCheck,
      grad: "grad-green",
    },
    { label: "نسبة الحضور", value: rate, icon: TrendingUp, grad: "grad-amber" },
  ];

  return (
    <div>
      <PageHero
        title="الرئيسية"
        subtitle="نظرة عامة على الخدمة"
        icon={Home}
        grad="grad-primary"
      />

      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card
              key={s.label}
              className="flex flex-col items-center gap-1.5 text-center lg:flex-row lg:gap-3 lg:text-right"
            >
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg shadow-soft ${s.grad}`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <span className="block text-lg font-bold text-ink lg:text-2xl">
                  {s.value}
                </span>
                <span className="block text-[10px] leading-tight text-ink-muted lg:text-xs">
                  {s.label}
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* على الكمبيوتر: عمودان — على الموبايل: عمود واحد */}
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-start">
        <div className="space-y-3">
          <SendNotificationBox />

          <Card>
            <h3 className="mb-1 font-bold text-ink">أهلاً بك 👋</h3>
            <p className="text-sm text-ink-muted">
              هذه هي الصفحة الرئيسية. تعرض ملخصاً سريعاً عن الخدمة، ويمكنك الانتقال
              بسرعة إلى المهام الأكثر استخداماً.
            </p>
          </Card>
        </div>

        <Card>
          <h3 className="mb-2 font-bold text-ink">اختصارات سريعة</h3>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/scanner"
              className="flex items-center gap-2 rounded-lg grad-violet p-3 text-sm font-semibold shadow-soft active:scale-95"
            >
              <ScanLine className="h-5 w-5" /> تسجيل حضور
            </Link>
            <Link
              href="/data/add"
              className="flex items-center gap-2 rounded-lg grad-accent p-3 text-sm font-semibold shadow-soft active:scale-95"
            >
              <Plus className="h-5 w-5" /> إضافة مخدوم
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
