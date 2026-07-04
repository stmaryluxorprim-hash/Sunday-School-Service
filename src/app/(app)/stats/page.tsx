"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart3,
  Users,
  CalendarCheck,
  Coins,
  TrendingUp,
  GraduationCap,
  Loader2,
  UserRound,
} from "lucide-react";
import { PageHero, Card } from "@/components/ui/page-card";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useSelectedDate } from "@/context/selected-date-context";
import { MemberRow, ClassRow, classDisplayName } from "@/lib/data/types";

type Stats = {
  totalMembers: number;
  males: number;
  females: number;
  presentToday: number;
  totalPoints: number;
  totalClasses: number;
  totalAttendance: number;
  byClass: { name: string; count: number }[];
};

const EMPTY: Stats = {
  totalMembers: 0,
  males: 0,
  females: 0,
  presentToday: 0,
  totalPoints: 0,
  totalClasses: 0,
  totalAttendance: 0,
  byClass: [],
};

export default function StatsPage() {
  const { date } = useSelectedDate();
  const [stats, setStats] = useState<Stats>(EMPTY);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const [{ data: mData }, { data: cData }, { data: aData }] = await Promise.all([
      supabase.from("members").select("*"),
      supabase.from("classes").select("*"),
      supabase.from("attendance_log").select("member_id").eq("attended_on", date),
    ]);

    const members = (mData as MemberRow[]) ?? [];
    const classes = (cData as ClassRow[]) ?? [];
    const presentIds = new Set(
      ((aData as { member_id: string }[]) ?? []).map((r) => r.member_id)
    );

    const byClassMap = new Map<string, number>();
    let males = 0;
    let females = 0;
    let totalPoints = 0;
    let totalAttendance = 0;
    for (const m of members) {
      if (m.gender === "female") females++;
      else males++;
      totalPoints += m.opening_balance ?? 0;
      totalAttendance += m.attendance_count ?? 0;
      const key = m.class_id ?? "__none__";
      byClassMap.set(key, (byClassMap.get(key) ?? 0) + 1);
    }

    const byClass = classes
      .map((c) => ({ name: classDisplayName(c), count: byClassMap.get(c.id) ?? 0 }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count);
    const noClass = byClassMap.get("__none__") ?? 0;
    if (noClass > 0) byClass.push({ name: "بدون فصل", count: noClass });

    setStats({
      totalMembers: members.length,
      males,
      females,
      presentToday: presentIds.size,
      totalPoints,
      totalClasses: classes.length,
      totalAttendance,
      byClass,
    });
    setLoading(false);
  }, [date]);

  useEffect(() => {
    load();
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    const channel = supabase
      .channel("stats_changes")
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

  const attendanceRate =
    stats.totalMembers > 0
      ? Math.round((stats.presentToday / stats.totalMembers) * 100)
      : 0;
  const maxByClass = Math.max(1, ...stats.byClass.map((x) => x.count));

  if (loading) {
    return (
      <div>
        <PageHero
          title="الاحصائيات"
          subtitle="نظرة عامة على الخدمة"
          icon={BarChart3}
          grad="grad-amber"
        />
        <div className="grid place-items-center py-16 text-ink-muted">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHero
        title="الاحصائيات"
        subtitle="نظرة عامة على الخدمة"
        icon={BarChart3}
        grad="grad-amber"
      />

      {/* بطاقات رئيسية — 4 أعمدة على الكمبيوتر */}
      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={Users}
          value={stats.totalMembers}
          label="عدد المخدومين"
          grad="grad-primary"
        />
        <StatCard
          icon={CalendarCheck}
          value={stats.presentToday}
          label="حضور اليوم"
          grad="grad-green"
        />
        <StatCard
          icon={Coins}
          value={stats.totalPoints}
          label="إجمالي النقاط"
          grad="grad-amber"
        />
        <StatCard
          icon={TrendingUp}
          value={`${attendanceRate}%`}
          label="نسبة الحضور اليوم"
          grad="grad-violet"
        />
      </div>

      {/* الذكور/الإناث + فصول + مرات حضور */}
      <div className="mb-3 grid grid-cols-3 gap-2">
        <MiniStat icon={UserRound} value={stats.males} label="ذكور" color="text-sky-600" />
        <MiniStat icon={UserRound} value={stats.females} label="إناث" color="text-pink-500" />
        <MiniStat icon={GraduationCap} value={stats.totalClasses} label="الفصول" color="text-teal-600" />
      </div>

      {/* على الكمبيوتر: التوزيع + الفصول جنباً إلى جنب */}
      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-3">

      {/* توزيع الجنس (شريط) */}
      {stats.totalMembers > 0 && (
        <Card className="mb-3">
          <h3 className="mb-3 text-sm font-bold text-ink">توزيع المخدومين</h3>
          <div className="flex h-3 w-full overflow-hidden rounded bg-surface-muted">
            <div
              className="h-full bg-sky-500"
              style={{ width: `${(stats.males / stats.totalMembers) * 100}%` }}
            />
            <div
              className="h-full bg-pink-500"
              style={{ width: `${(stats.females / stats.totalMembers) * 100}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-ink-muted">
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-500" /> ذكور (
              {stats.males})
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-pink-500" /> إناث (
              {stats.females})
            </span>
          </div>
        </Card>
      )}

      {/* المخدومون حسب الفصل */}
      {stats.byClass.length > 0 && (
        <Card>
          <h3 className="mb-3 text-sm font-bold text-ink">المخدومون حسب الفصل</h3>
          <div className="space-y-2.5">
            {stats.byClass.map((c) => (
              <div key={c.name}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="truncate font-semibold text-ink">{c.name}</span>
                  <span className="shrink-0 font-bold text-primary">{c.count}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded bg-surface-muted">
                  <div
                    className="h-full btn-gradient"
                    style={{ width: `${(c.count / maxByClass) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
      </div>

      {stats.totalMembers === 0 && (
        <Card className="text-center">
          <Users className="mx-auto mb-2 h-10 w-10 text-primary" />
          <p className="text-sm font-semibold text-ink">لا توجد بيانات بعد</p>
          <p className="mt-1 text-xs text-ink-muted">
            أضف مخدومين لبدء عرض الإحصائيات
          </p>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
  grad,
}: {
  icon: typeof Users;
  value: number | string;
  label: string;
  grad: string;
}) {
  return (
    <Card className="flex items-center gap-3">
      <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg shadow-soft ${grad}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-ink">{value}</p>
        <p className="truncate text-[11px] text-ink-muted">{label}</p>
      </div>
    </Card>
  );
}

function MiniStat({
  icon: Icon,
  value,
  label,
  color = "text-primary",
}: {
  icon: typeof Users;
  value: number;
  label: string;
  color?: string;
}) {
  return (
    <div className="animate-fade-up flex flex-col items-center gap-1 rounded-lg bg-surface p-3 text-center shadow-card border border-white/40">
      <Icon className={`h-5 w-5 ${color}`} />
      <span className="text-lg font-bold text-ink">{value}</span>
      <span className="text-[10px] leading-tight text-ink-muted">{label}</span>
    </div>
  );
}
