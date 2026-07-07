"use client";

/**
 * صفحة الإنجازات — إدارة تعريفات الإنجازات (إضافة/تعديل/حذف)
 * + منح الإنجازات للمخدومين وعرض المستلمين.
 * تُفتح من القائمة الجانبية فقط (وليست في الشريط السفلي).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Trophy,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Loader2,
  Users,
  Search,
  Award,
  Star,
  Medal,
  Crown,
  Sparkles,
  Heart,
  BookOpen,
  Flame,
  LucideIcon,
} from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { PageHero, Card } from "@/components/ui/page-card";
import type { MemberRow, ClassRow } from "@/lib/data/types";
import { classDisplayName } from "@/lib/data/types";

// ---------------------------------------------------------------------------
// الأنواع
// ---------------------------------------------------------------------------

type AchievementRow = {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  points: number;
  created_at?: string;
};

type GrantRow = {
  id: string;
  achievement_id: string;
  member_id: string;
  awarded_at: string;
};

// أيقونات متاحة للاختيار
const ICONS: { key: string; icon: LucideIcon; label: string }[] = [
  { key: "trophy", icon: Trophy, label: "كأس" },
  { key: "award", icon: Award, label: "وسام" },
  { key: "star", icon: Star, label: "نجمة" },
  { key: "medal", icon: Medal, label: "ميدالية" },
  { key: "crown", icon: Crown, label: "تاج" },
  { key: "sparkles", icon: Sparkles, label: "تألق" },
  { key: "heart", icon: Heart, label: "قلب" },
  { key: "book", icon: BookOpen, label: "كتاب" },
  { key: "flame", icon: Flame, label: "شعلة" },
];

const COLORS = ["#f59e0b", "#6366f1", "#10b981", "#ef4444", "#8b5cf6", "#0ea5e9", "#ec4899", "#64748b"];

function iconFor(key: string): LucideIcon {
  return ICONS.find((i) => i.key === key)?.icon ?? Trophy;
}

type EditState = Partial<AchievementRow> & { _new?: boolean };

// ---------------------------------------------------------------------------
// الصفحة
// ---------------------------------------------------------------------------

export default function AchievementsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [achievements, setAchievements] = useState<AchievementRow[]>([]);
  const [grants, setGrants] = useState<GrantRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [awarding, setAwarding] = useState<AchievementRow | null>(null); // مودال المنح
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (t: string) => {
    setToast(t);
    setTimeout(() => setToast(null), 2500);
  };

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    const [a, g, m, c] = await Promise.all([
      supabase.from("achievements").select("*").order("created_at", { ascending: false }),
      supabase.from("member_achievements").select("*"),
      supabase.from("members").select("*").order("name"),
      supabase.from("classes").select("*"),
    ]);
    setAchievements((a.data as AchievementRow[]) ?? []);
    setGrants((g.data as GrantRow[]) ?? []);
    setMembers((m.data as MemberRow[]) ?? []);
    setClasses((c.data as ClassRow[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  // عدد المستلمين لكل إنجاز
  const grantCount = useMemo(() => {
    const map = new Map<string, number>();
    grants.forEach((g) => map.set(g.achievement_id, (map.get(g.achievement_id) ?? 0) + 1));
    return map;
  }, [grants]);

  // ------- حفظ إنجاز (جديد/تعديل) -------
  const save = async () => {
    if (!editing?.name?.trim()) return;
    setSaving(true);
    const payload = {
      name: editing.name.trim(),
      description: editing.description?.trim() || null,
      icon: editing.icon || "trophy",
      color: editing.color || "#f59e0b",
      points: Number(editing.points) || 0,
    };
    if (editing._new) {
      await supabase.from("achievements").insert(payload);
    } else if (editing.id) {
      await supabase.from("achievements").update(payload).eq("id", editing.id);
    }
    setSaving(false);
    setEditing(null);
    showToast("تم الحفظ ✅");
    load();
  };

  const remove = async (a: AchievementRow) => {
    if (!confirm(`حذف إنجاز «${a.name}»؟ سيُحذف من كل المخدومين الحاصلين عليه.`)) return;
    await supabase.from("achievements").delete().eq("id", a.id);
    showToast("تم الحذف");
    load();
  };

  return (
    <div>
      <PageHero
        title="الإنجازات"
        subtitle="إدارة الإنجازات ومنحها للمخدومين"
        icon={Trophy}
        grad="grad-amber"
      />

      {!isSupabaseConfigured && (
        <Card className="mb-4 text-center text-sm text-ink-muted">
          يلزم إعداد Supabase أولاً لاستخدام هذه الصفحة.
        </Card>
      )}

      {/* زر إضافة */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={() =>
            setEditing({ _new: true, name: "", description: "", icon: "trophy", color: "#f59e0b", points: 0 })
          }
          className="btn-gradient flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-soft active:scale-95"
        >
          <Plus className="h-4 w-4" />
          إنجاز جديد
        </button>
      </div>

      {loading ? (
        <Card className="grid place-items-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </Card>
      ) : achievements.length === 0 ? (
        <Card className="py-10 text-center">
          <Trophy className="mx-auto mb-2 h-10 w-10 text-ink-muted" />
          <p className="text-sm font-semibold text-ink">لا توجد إنجازات بعد</p>
          <p className="mt-1 text-xs text-ink-muted">أضِف أول إنجاز بزر «إنجاز جديد»</p>
        </Card>
      ) : (
        <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
          {achievements.map((a) => {
            const Icon = iconFor(a.icon);
            const count = grantCount.get(a.id) ?? 0;
            return (
              <Card key={a.id} className="flex items-center gap-3">
                <div
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white shadow-soft"
                  style={{ background: `linear-gradient(115deg, ${a.color}, ${a.color}cc)` }}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-ink">{a.name}</p>
                  {a.description && (
                    <p className="truncate text-xs text-ink-muted">{a.description}</p>
                  )}
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-ink-muted">
                    <span className="rounded-full bg-surface-muted px-2 py-0.5 font-semibold">
                      {count} مستلم
                    </span>
                    {a.points > 0 && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700">
                        +{a.points} نقطة
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  <button
                    onClick={() => setAwarding(a)}
                    className="grid h-8 w-8 place-items-center rounded-lg bg-amber-100 text-amber-700 active:scale-95"
                    title="منح / المستلمون"
                  >
                    <Users className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setEditing({ ...a })}
                    className="grid h-8 w-8 place-items-center rounded-lg bg-surface-muted text-ink active:scale-95"
                    title="تعديل"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => remove(a)}
                    className="grid h-8 w-8 place-items-center rounded-lg bg-red-50 text-red-600 active:scale-95"
                    title="حذف"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ---------- مودال إضافة/تعديل ---------- */}
      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-surface p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-ink">
                {editing._new ? "إنجاز جديد" : "تعديل الإنجاز"}
              </h3>
              <button
                onClick={() => setEditing(null)}
                className="grid h-8 w-8 place-items-center rounded-lg bg-surface-muted text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mb-1 block text-xs font-bold text-ink-muted">الاسم *</label>
            <input
              value={editing.name ?? ""}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              className="mb-3 w-full rounded-xl border border-white/40 bg-surface-muted px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="مثال: حافظ المزمور"
            />

            <label className="mb-1 block text-xs font-bold text-ink-muted">الوصف</label>
            <input
              value={editing.description ?? ""}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              className="mb-3 w-full rounded-xl border border-white/40 bg-surface-muted px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="وصف مختصر (اختياري)"
            />

            <label className="mb-1 block text-xs font-bold text-ink-muted">الأيقونة</label>
            <div className="mb-3 flex flex-wrap gap-2">
              {ICONS.map(({ key, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setEditing({ ...editing, icon: key })}
                  className={`grid h-10 w-10 place-items-center rounded-xl transition ${
                    (editing.icon ?? "trophy") === key
                      ? "text-white shadow-soft"
                      : "bg-surface-muted text-ink-muted"
                  }`}
                  style={
                    (editing.icon ?? "trophy") === key
                      ? { background: editing.color ?? "#f59e0b" }
                      : undefined
                  }
                >
                  <Icon className="h-5 w-5" />
                </button>
              ))}
            </div>

            <label className="mb-1 block text-xs font-bold text-ink-muted">اللون</label>
            <div className="mb-3 flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setEditing({ ...editing, color: c })}
                  className={`h-8 w-8 rounded-full transition ${
                    (editing.color ?? "#f59e0b") === c ? "ring-2 ring-offset-2 ring-primary" : ""
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>

            <label className="mb-1 block text-xs font-bold text-ink-muted">
              نقاط تُضاف عند المنح
            </label>
            <input
              type="number"
              min={0}
              value={editing.points ?? 0}
              onChange={(e) => setEditing({ ...editing, points: Number(e.target.value) })}
              className="mb-4 w-full rounded-xl border border-white/40 bg-surface-muted px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/40"
            />

            <button
              onClick={save}
              disabled={saving || !editing.name?.trim()}
              className="btn-gradient flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold shadow-soft active:scale-95 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              حفظ
            </button>
          </div>
        </div>
      )}

      {/* ---------- مودال المنح / المستلمين ---------- */}
      {awarding && (
        <AwardSheet
          achievement={awarding}
          members={members}
          classes={classes}
          grants={grants.filter((g) => g.achievement_id === awarding.id)}
          onClose={() => setAwarding(null)}
          onChanged={() => {
            load();
            showToast("تم التحديث ✅");
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-ink px-4 py-2 text-sm font-bold text-white shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AwardSheet — منح/سحب الإنجاز من المخدومين
// ---------------------------------------------------------------------------

function AwardSheet({
  achievement,
  members,
  classes,
  grants,
  onClose,
  onChanged,
}: {
  achievement: AchievementRow;
  members: MemberRow[];
  classes: ClassRow[];
  grants: GrantRow[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [busy, setBusy] = useState<string | null>(null); // member id being toggled

  const grantedIds = useMemo(() => new Set(grants.map((g) => g.member_id)), [grants]);

  const classNames = useMemo(() => {
    const map = new Map<string, string>();
    classes.forEach((c) => map.set(c.id, classDisplayName(c)));
    return map;
  }, [classes]);

  const filtered = useMemo(() => {
    let list = members;
    if (classFilter) list = list.filter((m) => m.class_id === classFilter);
    if (search.trim()) {
      const q = search.trim();
      list = list.filter((m) => m.name.includes(q) || m.code.includes(q));
    }
    // الحاصلون على الإنجاز أولاً
    return [...list].sort((a, b) => {
      const ga = grantedIds.has(a.id) ? 0 : 1;
      const gb = grantedIds.has(b.id) ? 0 : 1;
      return ga - gb || a.name.localeCompare(b.name, "ar");
    });
  }, [members, classFilter, search, grantedIds]);

  const toggle = async (m: MemberRow) => {
    setBusy(m.id);
    if (grantedIds.has(m.id)) {
      // سحب الإنجاز
      await supabase
        .from("member_achievements")
        .delete()
        .eq("achievement_id", achievement.id)
        .eq("member_id", m.id);
    } else {
      // منح الإنجاز (+ نقاط إن وُجدت)
      await supabase.from("member_achievements").insert({
        achievement_id: achievement.id,
        member_id: m.id,
      });
      if (achievement.points > 0) {
        await supabase.rpc("adjust_balance", {
          p_member_id: m.id,
          p_amount: achievement.points,
          p_reason: `إنجاز: ${achievement.name}`,
          p_date: new Date().toISOString().slice(0, 10),
        });
      }
    }
    setBusy(null);
    onChanged();
  };

  const Icon = iconFor(achievement.icon);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm lg:items-center lg:p-4">
      <div className="flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-2xl bg-surface shadow-2xl lg:rounded-2xl">
        {/* رأس */}
        <div className="flex items-center gap-3 border-b border-white/30 p-4">
          <div
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white shadow-soft"
            style={{ background: achievement.color }}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-ink">{achievement.name}</p>
            <p className="text-xs text-ink-muted">{grants.length} مستلم — اضغط لمنح/سحب</p>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg bg-surface-muted text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* فلاتر */}
        <div className="flex gap-2 p-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو الكود..."
              className="w-full rounded-xl border border-white/40 bg-surface-muted py-2.5 pr-9 pl-3 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="rounded-xl border border-white/40 bg-surface-muted px-3 py-2.5 text-sm text-ink outline-none"
          >
            <option value="">كل الفصول</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {classDisplayName(c)}
              </option>
            ))}
          </select>
        </div>

        {/* القائمة */}
        <div className="flex-1 space-y-1.5 overflow-y-auto px-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-muted">لا توجد نتائج</p>
          ) : (
            filtered.map((m) => {
              const granted = grantedIds.has(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => toggle(m)}
                  disabled={busy === m.id}
                  className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-right transition active:scale-[0.99] ${
                    granted ? "bg-amber-50 ring-1 ring-amber-300" : "bg-surface-muted/60"
                  }`}
                >
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${
                      granted ? "text-white" : "bg-surface text-ink-muted"
                    }`}
                    style={granted ? { background: achievement.color } : undefined}
                  >
                    {busy === m.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : granted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      m.name.slice(0, 1)
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{m.name}</span>
                    <span className="block truncate text-[11px] text-ink-muted">
                      {m.class_id ? classNames.get(m.class_id) ?? "بدون فصل" : "بدون فصل"}
                    </span>
                  </span>
                  {granted && (
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                      ممنوح
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
