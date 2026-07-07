"use client";

/**
 * صفحة الإعلانات والفعاليات — بنفس مفهوم صفحة الإنجازات:
 * قائمة كروت + إضافة/تعديل/حذف عبر مودال.
 * تُفتح من القائمة الجانبية فقط (وليست في الشريط السفلي).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Megaphone,
  CalendarDays,
  MapPin,
  Clock,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Loader2,
} from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { PageHero, Card } from "@/components/ui/page-card";

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  kind: "event" | "announcement";
  event_date: string | null;
  event_time: string | null;
  location: string | null;
  created_at?: string;
};

type EditState = Partial<EventRow> & { _new?: boolean };

type Filter = "all" | "event" | "announcement";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("ar-EG", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(iso + "T00:00:00"));
  } catch {
    return iso;
  }
}

export default function EventsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
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
    const { data } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false });
    setEvents((data as EventRow[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () => (filter === "all" ? events : events.filter((e) => e.kind === filter)),
    [events, filter]
  );

  const save = async () => {
    if (!editing?.title?.trim()) return;
    setSaving(true);
    const payload = {
      title: editing.title.trim(),
      description: editing.description?.trim() || null,
      kind: editing.kind ?? "event",
      event_date: editing.event_date || null,
      event_time: editing.event_time?.trim() || null,
      location: editing.location?.trim() || null,
    };
    if (editing._new) {
      await supabase.from("events").insert(payload);
    } else if (editing.id) {
      await supabase.from("events").update(payload).eq("id", editing.id);
    }
    setSaving(false);
    setEditing(null);
    showToast("تم الحفظ ✅");
    load();
  };

  const remove = async (e: EventRow) => {
    if (!confirm(`حذف «${e.title}»؟`)) return;
    await supabase.from("events").delete().eq("id", e.id);
    showToast("تم الحذف");
    load();
  };

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: "الكل" },
    { key: "event", label: "فعاليات" },
    { key: "announcement", label: "إعلانات" },
  ];

  return (
    <div>
      <PageHero
        title="الإعلانات والفعاليات"
        subtitle="إدارة الأنشطة والإعلانات للخدمة"
        icon={Megaphone}
        grad="grad-violet"
      />

      {!isSupabaseConfigured && (
        <Card className="mb-4 text-center text-sm text-ink-muted">
          يلزم إعداد Supabase أولاً لاستخدام هذه الصفحة.
        </Card>
      )}

      {/* فلاتر + إضافة */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition active:scale-95 ${
                filter === f.key
                  ? "grad-violet text-white shadow-soft"
                  : "bg-surface text-ink-muted shadow-card"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={() =>
            setEditing({
              _new: true,
              title: "",
              description: "",
              kind: "event",
              event_date: new Date().toISOString().slice(0, 10),
            })
          }
          className="btn-gradient flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-soft active:scale-95"
        >
          <Plus className="h-4 w-4" />
          جديد
        </button>
      </div>

      {loading ? (
        <Card className="grid place-items-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="py-10 text-center">
          <Megaphone className="mx-auto mb-2 h-10 w-10 text-ink-muted" />
          <p className="text-sm font-semibold text-ink">لا توجد عناصر بعد</p>
          <p className="mt-1 text-xs text-ink-muted">أضِف فعالية أو إعلاناً بزر «جديد»</p>
        </Card>
      ) : (
        <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
          {filtered.map((e) => {
            const isEvent = e.kind === "event";
            return (
              <Card key={e.id} className="flex items-start gap-3">
                <div
                  className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white shadow-soft ${
                    isEvent ? "grad-violet" : "grad-amber"
                  }`}
                >
                  {isEvent ? <CalendarDays className="h-6 w-6" /> : <Megaphone className="h-6 w-6" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-ink">{e.title}</p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        isEvent ? "bg-violet-100 text-violet-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {isEvent ? "فعالية" : "إعلان"}
                    </span>
                  </div>
                  {e.description && (
                    <p className="mt-0.5 whitespace-pre-line text-xs text-ink-muted">{e.description}</p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-muted">
                    {e.event_date && (
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatDate(e.event_date)}
                      </span>
                    )}
                    {e.event_time && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {e.event_time}
                      </span>
                    )}
                    {e.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {e.location}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  <button
                    onClick={() => setEditing({ ...e })}
                    className="grid h-8 w-8 place-items-center rounded-lg bg-surface-muted text-ink active:scale-95"
                    title="تعديل"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => remove(e)}
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
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-surface p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-ink">{editing._new ? "عنصر جديد" : "تعديل"}</h3>
              <button
                onClick={() => setEditing(null)}
                className="grid h-8 w-8 place-items-center rounded-lg bg-surface-muted text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* النوع */}
            <label className="mb-1 block text-xs font-bold text-ink-muted">النوع</label>
            <div className="mb-3 grid grid-cols-2 gap-2">
              {(
                [
                  { key: "event", label: "فعالية", icon: CalendarDays },
                  { key: "announcement", label: "إعلان", icon: Megaphone },
                ] as const
              ).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setEditing({ ...editing, kind: key })}
                  className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition active:scale-95 ${
                    (editing.kind ?? "event") === key
                      ? "grad-violet text-white shadow-soft"
                      : "bg-surface-muted text-ink-muted"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>

            <label className="mb-1 block text-xs font-bold text-ink-muted">العنوان *</label>
            <input
              value={editing.title ?? ""}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              className="mb-3 w-full rounded-xl border border-white/40 bg-surface-muted px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="عنوان الفعالية / الإعلان"
            />

            <label className="mb-1 block text-xs font-bold text-ink-muted">التفاصيل</label>
            <textarea
              value={editing.description ?? ""}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              rows={3}
              className="mb-3 w-full resize-y rounded-xl border border-white/40 bg-surface-muted px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="وصف / تفاصيل (اختياري)"
            />

            <div className="mb-3 grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-ink-muted">التاريخ</label>
                <input
                  type="date"
                  value={editing.event_date ?? ""}
                  onChange={(e) => setEditing({ ...editing, event_date: e.target.value })}
                  className="w-full rounded-xl border border-white/40 bg-surface-muted px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-ink-muted">الوقت</label>
                <input
                  value={editing.event_time ?? ""}
                  onChange={(e) => setEditing({ ...editing, event_time: e.target.value })}
                  className="w-full rounded-xl border border-white/40 bg-surface-muted px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="مثال: 5 مساءً"
                />
              </div>
            </div>

            <label className="mb-1 block text-xs font-bold text-ink-muted">المكان</label>
            <input
              value={editing.location ?? ""}
              onChange={(e) => setEditing({ ...editing, location: e.target.value })}
              className="mb-4 w-full rounded-xl border border-white/40 bg-surface-muted px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="مكان الفعالية (اختياري)"
            />

            <button
              onClick={save}
              disabled={saving || !editing.title?.trim()}
              className="btn-gradient flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold shadow-soft active:scale-95 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              حفظ
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-ink px-4 py-2 text-sm font-bold text-white shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}
