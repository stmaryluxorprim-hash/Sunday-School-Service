"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
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
  Phone,
  MessageSquare,
  MessageCircle,
  QrCode,
  UserPen,
  Trash2,
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
import { telLink, smsLink, whatsappLink, hasPhone } from "@/lib/data/contact";
import {
  MemberQrSheet,
  MemberDetailsSheet,
  MemberDeleteSheet,
} from "@/components/members/member-sheets";
import {
  markAttendance,
  unmarkAttendance,
  adjustBalance,
  OpResult,
} from "@/lib/data/operations";
import { useSelectedDate } from "@/context/selected-date-context";
import { useSettings } from "@/context/settings-context";

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
  const { branding, ready: settingsReady } = useSettings();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  // مجموعة معرّفات من حضر في التاريخ المختار
  const [presentToday, setPresentToday] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [controls, setControls] = useState<ControlsState>(DEFAULT_CONTROLS);
  // بمجرد جاهزية الإعدادات: ابدأ بعدد النقاط الافتراضي من الهوية (مرّة واحدة).
  const pointsSeeded = useRef(false);
  useEffect(() => {
    if (!settingsReady || pointsSeeded.current) return;
    pointsSeeded.current = true;
    setControls((prev) => ({
      ...prev,
      points: branding.defaultPoints ?? prev.points,
    }));
  }, [settingsReady, branding.defaultPoints]);

  // حالة العملية الجارية + رسالة (toast)
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  // أوراق الوظائف: QR / بيانات / إلغاء
  const [qrFor, setQrFor] = useState<MemberRow | null>(null);
  const [detailsFor, setDetailsFor] = useState<MemberRow | null>(null);
  const [deleteFor, setDeleteFor] = useState<MemberRow | null>(null);

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

  // تنفيذ الوظيفة على مخدوم محدد — بدون نوافذ منبثقة للنقاط
  const runAction = useCallback(
    async (m: MemberRow, action: ActionKey) => {
      if (busyId) return;

      // وظائف التواصل المباشرة: اتصال / SMS / واتساب
      if (action === "call" || action === "sms" || action === "whatsapp") {
        if (!hasPhone(m.phone)) {
          setToast({ ok: false, text: "لا يوجد رقم تليفون لهذا المخدوم" });
          return;
        }
        const greeting = `مرحباً ${m.name || ""}`.trim();
        if (action === "call") {
          window.location.href = telLink(m.phone);
        } else if (action === "sms") {
          window.location.href = smsLink(m.phone, greeting);
        } else {
          window.open(whatsappLink(m.phone, greeting), "_blank", "noopener");
        }
        return;
      }

      // رسالة داخلية: تفتح تطبيق الرسائل على محادثة هذا المخدوم
      if (action === "internal_message") {
        window.dispatchEvent(
          new CustomEvent("open-internal-message", {
            detail: { memberId: m.id, memberName: m.name },
          })
        );
        return;
      }

      // إظهار QR Code المخدوم
      if (action === "qr_code") {
        setQrFor(m);
        return;
      }

      // إظهار/تعديل بيانات المخدوم
      if (action === "details") {
        setDetailsFor(m);
        return;
      }

      // إلغاء المخدوم (مع تأكيد)
      if (action === "delete") {
        setDeleteFor(m);
        return;
      }

      setBusyId(m.id);
      try {
        let res: OpResult;
        if (action === "attendance") {
          res = await markAttendance(m.id, date, controls.points);
        } else if (action === "unattendance") {
          res = await unmarkAttendance(m.id, date, controls.points);
        } else {
          // إضافة/خصم نقاط مباشرة — القيمة من عدّاد النقاط، والسبب من نوع الوظيفة
          const amount =
            action === "add_points" ? controls.points : -controls.points;
          const reason = action === "add_points" ? "إضافة نقاط" : "خصم نقاط";
          res = await adjustBalance(m.id, amount, reason, date);
        }
        applyResult(res);
        if (res.ok && (action === "attendance" || action === "unattendance"))
          loadAttendance();
      } finally {
        setBusyId(null);
      }
    },
    [busyId, date, loadAttendance, controls.points]
  );

  return (
    <div>
      <PageHero
        title="البيانات"
        subtitle="إدارة بيانات المخدومين"
        icon={Database}
        grad="grad-teal"
      />

      {/* على الكمبيوتر: شريط التحكم + البحث جنباً إلى جنب */}
      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-3">
        {/* شريط التحكم: الفصل / ترتيب حسب / إظهار / الوظيفة */}
        <DataControls classes={classes} value={controls} onChange={setControls} />

        {/* بحث + إضافة */}
        <div className="animate-fade-up mb-4 rounded-xl bg-surface p-3 shadow-card border border-white/40 lg:mb-3">
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-lg bg-surface-muted px-3 py-2.5">
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
              className="grid h-11 w-11 place-items-center rounded-lg grad-teal text-white shadow-soft active:scale-95"
            >
              <Plus className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid place-items-center py-16 text-ink-muted">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : members.length === 0 ? (
        <div className="animate-fade-up rounded-xl bg-surface p-8 text-center shadow-card border border-white/40">
          <User className="mx-auto mb-2 h-10 w-10 text-primary" />
          <p className="text-sm font-semibold text-ink">لا يوجد مخدومين بعد</p>
          <p className="mt-1 text-xs text-ink-muted">اضغط + لإضافة مخدوم</p>
        </div>
      ) : sorted.length === 0 ? (
        <div className="animate-fade-up rounded-xl bg-surface p-8 text-center shadow-card border border-white/40">
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
                className="animate-fade-up overflow-hidden rounded-xl bg-surface shadow-card border border-white/40"
                style={{ borderTop: `3px solid ${primary}` }}
              >
                <button
                  onClick={() => toggle(key)}
                  className="flex w-full items-center gap-3 p-3 text-right active:scale-[0.99]"
                >
                  <div
                    className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg text-white shadow-soft"
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
                  <div className="space-y-2 px-3 pb-3 lg:grid lg:grid-cols-2 lg:gap-2 lg:space-y-0 xl:grid-cols-3">
                    {g.members.length === 0 ? (
                      <p className="rounded-lg bg-surface-muted px-3 py-3 text-center text-xs text-ink-muted lg:col-span-full">
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
        <div className="animate-fade-up rounded-xl bg-surface p-3 shadow-card border border-white/40">
          <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-2 lg:space-y-0 xl:grid-cols-3">
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

      {/* ورقة QR Code */}
      <MemberQrSheet member={qrFor} onClose={() => setQrFor(null)} />

      {/* ورقة بيانات المخدوم (عرض + تعديل) */}
      <MemberDetailsSheet
        member={detailsFor}
        classes={classes}
        onClose={() => setDetailsFor(null)}
        onSaved={applyResult}
      />

      {/* ورقة تأكيد إلغاء المخدوم */}
      <MemberDeleteSheet
        member={deleteFor}
        onClose={() => setDeleteFor(null)}
        onDeleted={(id, message) => {
          setMembers((prev) => prev.filter((x) => x.id !== id));
          setToast({ ok: true, text: message });
        }}
      />

      {/* toast */}
      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-50 flex justify-center px-4">
          <div
            className={`animate-fade-up rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-soft ${
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

/** أيقونة واتساب بسيطة (SVG) — تجنّباً لإضافة اعتمادية جديدة. */
function WhatsAppIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.13h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.42-.14 0-.31-.02-.47-.02-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29z" />
    </svg>
  );
}

/** زر تنفيذ الوظيفة حسب نوعها — لكل وظيفة لون مميّز. */
function actionMeta(action: ActionKey): {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  cls: string;
} {
  switch (action) {
    case "attendance":
      return { Icon: CalendarCheck, label: "حضور", cls: "bg-emerald-600" };
    case "unattendance":
      return { Icon: CalendarX, label: "إلغاء", cls: "bg-rose-600" };
    case "add_points":
      return { Icon: Coins, label: "+ نقاط", cls: "bg-amber-500" };
    case "deduct_points":
      return { Icon: Coins, label: "- نقاط", cls: "bg-orange-600" };
    case "call":
      return { Icon: Phone, label: "اتصال", cls: "bg-sky-600" };
    case "sms":
      return { Icon: MessageSquare, label: "SMS", cls: "bg-violet-600" };
    case "whatsapp":
      return { Icon: WhatsAppIcon, label: "واتساب", cls: "bg-[#25D366]" };
    case "internal_message":
      return { Icon: MessageCircle, label: "رسالة", cls: "btn-gradient" };
    case "qr_code":
      return { Icon: QrCode, label: "QR", cls: "bg-slate-700" };
    case "details":
      return { Icon: UserPen, label: "بيانات", cls: "grad-teal" };
    case "delete":
      return { Icon: Trash2, label: "إلغاء", cls: "bg-rose-700" };
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
  const { Icon, label, cls } = actionMeta(action);
  return (
    <div className="flex items-center gap-3 rounded-lg bg-surface-muted p-2.5">
      <div className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl btn-gradient text-white">
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
          <span className="inline-flex items-center gap-1 rounded bg-secondary-soft px-1.5 py-0.5 text-[10px] font-bold text-secondary">
            <CalendarCheck className="h-3 w-3" />
            {m.attendance_count ?? 0} حضور
          </span>
          {/* badge الرصيد/النقاط */}
          <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
            <Coins className="h-3 w-3" />
            {m.opening_balance ?? 0}
          </span>
          {/* علامة حضور اليوم المختار */}
          {present && (
            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
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
        className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-2 text-[11px] font-bold text-white shadow-soft active:scale-95 disabled:opacity-60 ${cls}`}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
        <span className="hidden xs:inline">{label}</span>
      </button>
    </div>
  );
}
