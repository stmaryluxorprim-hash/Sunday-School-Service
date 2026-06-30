"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Database,
  Search,
  Plus,
  Loader2,
  User,
  GraduationCap,
  ChevronDown,
  CalendarCheck,
  CalendarX,
  Coins,
} from "lucide-react";
import { PageHero } from "@/components/ui/page-card";
import { createClient } from "@/lib/supabase/client";
import {
  MemberRow,
  ClassRow,
  AttendanceRow,
  classDisplayName,
  ShowFilter,
  ActionKey,
} from "@/lib/data/types";
import {
  DataControls,
  ControlsState,
  DEFAULT_CONTROLS,
} from "@/components/members/data-controls";
import { PointsDialog } from "@/components/members/points-dialog";
import {
  markAttendance,
  unmarkAttendance,
  adjustBalance,
  isPointsAction,
  OpResult,
} from "@/lib/data/operations";
import { useSelectedDate } from "@/context/selected-date-context";

type Group = {
  cls: ClassRow | null; // null = members with no class
  members: MemberRow[];
};

/** هل يجتاز المخدوم فلتر إظهار واحد؟ */
function passesFilter(m: MemberRow, f: ShowFilter): boolean {
  switch (f) {
    case "male":
      return m.gender === "male";
    case "female":
      return m.gender === "female";
    case "with_phone":
      return !!m.phone;
    case "no_phone":
      return !m.phone;
    case "with_photo":
      return !!m.photo_url;
    case "no_class":
      return !m.class_id;
    case "positive_balance":
      return (m.opening_balance ?? 0) > 0;
    case "negative_balance":
      return (m.opening_balance ?? 0) < 0;
    default:
      return true;
  }
}

export default function DataPage() {
  const { date } = useSelectedDate(); // التاريخ المختار من الهيدر (YYYY-MM-DD)
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  // مجموعة معرّفات من حضر في التاريخ المختار
  const [presentToday, setPresentToday] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [controls, setControls] = useState<ControlsState>(DEFAULT_CONTROLS);

  // حالة العملية الجارية + رسالة (toast)
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  // dialog النقاط
  const [pointsFor, setPointsFor] = useState<MemberRow | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: mData }, { data: cData }] = await Promise.all([
      supabase.from("members").select("*").order("created_at", { ascending: false }),
      supabase.from("classes").select("*").order("created_at", { ascending: true }),
    ]);
    setMembers((mData as MemberRow[]) ?? []);
    setClasses((cData as ClassRow[]) ?? []);
    setLoading(false);
  }, []);

  // جلب حضور التاريخ المختار
  const loadAttendance = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("attendance_log")
      .select("member_id")
      .eq("attended_on", date);
    const set = new Set<string>();
    for (const r of (data as Pick<AttendanceRow, "member_id">[]) ?? [])
      set.add(r.member_id);
    setPresentToday(set);
  }, [date]);

  useEffect(() => {
    load();
    const supabase = createClient();
    const channel = supabase
      .channel("data_page_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "members" }, () =>
        load()
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "classes" }, () =>
        load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  // أعِد جلب الحضور كلما تغيّر التاريخ المختار
  useEffect(() => {
    loadAttendance();
    const supabase = createClient();
    const channel = supabase
      .channel(`attendance_${date}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendance_log" },
        () => loadAttendance()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [date, loadAttendance]);

  // toast auto-hide
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // 1) فلترة: بحث + الفصل المختار + فلاتر الإظهار المتعددة.
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return members.filter((m) => {
      if (needle) {
        const hay = `${m.name ?? ""} ${m.code} ${m.phone ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if (controls.classId !== "all" && m.class_id !== controls.classId) return false;
      for (const f of controls.filters) {
        if (!passesFilter(m, f)) return false;
      }
      return true;
    });
  }, [members, q, controls.classId, controls.filters]);

  // 2) ترتيب حسب المفتاح والاتجاه.
  const sorted = useMemo(() => {
    const dir = controls.sortDir === "asc" ? 1 : -1;
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (controls.sortKey) {
        case "name":
          cmp = (a.name || "").localeCompare(b.name || "", "ar");
          break;
        case "attendance_days":
          cmp = (a.attendance_count ?? 0) - (b.attendance_count ?? 0);
          break;
        case "balance":
          cmp = (a.opening_balance ?? 0) - (b.opening_balance ?? 0);
          break;
        case "created_at":
          cmp =
            new Date(a.created_at ?? 0).getTime() -
            new Date(b.created_at ?? 0).getTime();
          break;
      }
      return cmp * dir;
    });
    return arr;
  }, [filtered, controls.sortKey, controls.sortDir]);

  // 3) عند "كل الفصول": تجميع. عند فصل محدد: قائمة مسطّحة.
  const grouped = controls.classId === "all";
  const groups = useMemo<Group[]>(() => {
    if (!grouped) return [];
    const byClass = new Map<string, MemberRow[]>();
    const noClass: MemberRow[] = [];
    for (const m of sorted) {
      if (m.class_id) {
        const arr = byClass.get(m.class_id) ?? [];
        arr.push(m);
        byClass.set(m.class_id, arr);
      } else {
        noClass.push(m);
      }
    }
    const result: Group[] = classes.map((c) => ({
      cls: c,
      members: byClass.get(c.id) ?? [],
    }));
    if (noClass.length > 0) result.push({ cls: null, members: noClass });
    return result;
  }, [grouped, sorted, classes]);

  const toggle = (key: string) =>
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  // معالجة نتيجة العملية (toast + تحديث محلي سريع)
  const applyResult = (res: OpResult) => {
    setToast({ ok: res.ok, text: res.message });
    if (res.ok) {
      setMembers((prev) =>
        prev.map((m) => (m.id === res.member.id ? res.member : m))
      );
    }
  };

  // تنفيذ الوظيفة على مخدوم محدد
  const runAction = useCallback(
    async (m: MemberRow, action: ActionKey) => {
      if (busyId) return;
      // وظائف النقاط تفتح dialog لإدخال القيمة والسبب
      if (isPointsAction(action)) {
        setPointsFor(m);
        return;
      }
      setBusyId(m.id);
      try {
        const res =
          action === "attendance"
            ? await markAttendance(m.id, date)
            : await unmarkAttendance(m.id, date);
        applyResult(res);
        if (res.ok) loadAttendance();
      } finally {
        setBusyId(null);
      }
    },
    [busyId, date, loadAttendance]
  );

  // تأكيد dialog النقاط
  const confirmPoints = async (amount: number, reason: string) => {
    if (!pointsFor) return;
    setBusyId(pointsFor.id);
    try {
      const res = await adjustBalance(pointsFor.id, amount, reason, date);
      applyResult(res);
      if (res.ok) setPointsFor(null);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHero title="البيانات" subtitle="إدارة بيانات المخدومين" icon={Database} />

      {/* شريط التحكم: الفصل / ترتيب حسب / إظهار / الوظيفة */}
      <DataControls classes={classes} value={controls} onChange={setControls} />

      {/* بحث + إضافة */}
      <div className="animate-fade-up mb-4 rounded-3xl bg-surface p-3 shadow-card border border-white/40">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-2xl bg-surface-muted px-3 py-2.5">
            <Search className="h-4 w-4 text-ink-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="بحث بالاسم أو الكود أو التليفون..."
              className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
            />
          </div>
          <Link
            href="/data/add"
            className="grid h-11 w-11 place-items-center rounded-2xl btn-gradient text-white shadow-soft active:scale-95"
          >
            <Plus className="h-5 w-5" />
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="grid place-items-center py-16 text-ink-muted">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : members.length === 0 ? (
        <div className="animate-fade-up rounded-3xl bg-surface p-8 text-center shadow-card border border-white/40">
          <User className="mx-auto mb-2 h-10 w-10 text-primary" />
          <p className="text-sm font-semibold text-ink">لا يوجد مخدومين بعد</p>
          <p className="mt-1 text-xs text-ink-muted">اضغط + لإضافة مخدوم</p>
        </div>
      ) : sorted.length === 0 ? (
        <div className="animate-fade-up rounded-3xl bg-surface p-8 text-center shadow-card border border-white/40">
          <Search className="mx-auto mb-2 h-10 w-10 text-primary" />
          <p className="text-sm font-semibold text-ink">لا نتائج مطابقة</p>
          <p className="mt-1 text-xs text-ink-muted">جرّب تغيير الفصل أو الفلاتر</p>
        </div>
      ) : grouped ? (
        <div className="space-y-4">
          {groups.map((g) => {
            const key = g.cls?.id ?? "__none__";
            const title = g.cls ? classDisplayName(g.cls) : "بدون فصل";
            const primary = g.cls?.color_primary ?? "#6d5dfc";
            const accent = g.cls?.color_accent ?? "#f15bb5";
            const isCollapsed = collapsed[key];
            const filtering = q.trim() || controls.filters.length > 0;
            if (g.members.length === 0 && filtering) return null;
            return (
              <section
                key={key}
                className="animate-fade-up overflow-hidden rounded-3xl bg-surface shadow-card border border-white/40"
              >
                <button
                  onClick={() => toggle(key)}
                  className="flex w-full items-center gap-3 p-3 text-right active:scale-[0.99]"
                >
                  <div
                    className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl text-white shadow-soft"
                    style={{ background: `linear-gradient(100deg, ${primary}, ${accent})` }}
                  >
                    {g.cls?.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={g.cls.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <GraduationCap className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-ink">{title}</p>
                    <p className="text-xs text-ink-muted">{g.members.length} مخدوم</p>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 text-ink-muted transition-transform ${
                      isCollapsed ? "-rotate-90" : ""
                    }`}
                  />
                </button>

                {!isCollapsed && (
                  <div className="space-y-2 px-3 pb-3">
                    {g.members.length === 0 ? (
                      <p className="rounded-2xl bg-surface-muted px-3 py-3 text-center text-xs text-ink-muted">
                        لا يوجد مخدومين في هذا الفصل
                      </p>
                    ) : (
                      g.members.map((m) => (
                        <MemberItem
                          key={m.id}
                          m={m}
                          action={controls.action}
                          present={presentToday.has(m.id)}
                          busy={busyId === m.id}
                          onRun={() => runAction(m, controls.action)}
                        />
                      ))
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="animate-fade-up rounded-3xl bg-surface p-3 shadow-card border border-white/40">
          <div className="space-y-2">
            {sorted.map((m) => (
              <MemberItem
                key={m.id}
                m={m}
                action={controls.action}
                present={presentToday.has(m.id)}
                busy={busyId === m.id}
                onRun={() => runAction(m, controls.action)}
              />
            ))}
          </div>
        </div>
      )}

      {/* dialog النقاط */}
      <PointsDialog
        open={!!pointsFor}
        mode={controls.action === "deduct_points" ? "deduct" : "add"}
        memberName={pointsFor?.name || ""}
        busy={!!busyId}
        onClose={() => setPointsFor(null)}
        onConfirm={confirmPoints}
      />

      {/* toast */}
      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-50 flex justify-center px-4">
          <div
            className={`animate-fade-up rounded-2xl px-4 py-2.5 text-sm font-semibold text-white shadow-soft ${
              toast.ok ? "bg-emerald-600" : "bg-rose-600"
            }`}
          >
            {toast.text}
          </div>
        </div>
      )}
    </div>
  );
}

/** زر تنفيذ الوظيفة حسب نوعها. */
function actionMeta(action: ActionKey) {
  switch (action) {
    case "attendance":
      return { Icon: CalendarCheck, label: "حضور" };
    case "unattendance":
      return { Icon: CalendarX, label: "إلغاء" };
    case "add_points":
      return { Icon: Coins, label: "+ نقاط" };
    case "deduct_points":
      return { Icon: Coins, label: "- نقاط" };
  }
}

function MemberItem({
  m,
  action,
  present,
  busy,
  onRun,
}: {
  m: MemberRow;
  action: ActionKey;
  present: boolean;
  busy: boolean;
  onRun: () => void;
}) {
  const { Icon, label } = actionMeta(action);
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface-muted p-2.5">
      <div className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full btn-gradient text-white">
        {m.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.photo_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <User className="h-5 w-5" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-ink">{m.name || "—"}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          {/* badge عدد مرات الحضور */}
          <span className="inline-flex items-center gap-1 rounded-lg bg-primary-soft px-1.5 py-0.5 text-[10px] font-bold text-primary">
            <CalendarCheck className="h-3 w-3" />
            {m.attendance_count ?? 0} حضور
          </span>
          {/* badge الرصيد/النقاط */}
          <span className="inline-flex items-center gap-1 rounded-lg bg-accent-soft px-1.5 py-0.5 text-[10px] font-bold text-accent">
            <Coins className="h-3 w-3" />
            {m.opening_balance ?? 0}
          </span>
          {/* علامة حضور اليوم المختار */}
          {present && (
            <span className="rounded-lg bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
              ✓ حضر اليوم
            </span>
          )}
        </div>
      </div>

      {/* زر تنفيذ الوظيفة على هذا المخدوم */}
      <button
        onClick={onRun}
        disabled={busy}
        title={label}
        className="flex shrink-0 items-center gap-1 rounded-xl btn-gradient px-2.5 py-2 text-[11px] font-bold text-white shadow-soft active:scale-95 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
        <span className="hidden xs:inline">{label}</span>
      </button>
    </div>
  );
}
