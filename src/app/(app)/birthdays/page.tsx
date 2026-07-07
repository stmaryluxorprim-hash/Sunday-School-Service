"use client";

/**
 * صفحة أعياد الميلاد — عرض أعياد الميلاد بالشهر مع فلترة بالفصل
 * وأزرار تهنئة (واتساب / اتصال / SMS) لكل مخدوم.
 * تُفتح من القائمة الجانبية فقط (وليست في الشريط السفلي).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Cake,
  ChevronRight,
  ChevronLeft,
  CalendarDays,
  Phone,
  MessageCircle,
  MessageSquareText,
  Loader2,
  PhoneOff,
} from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { PageHero, Card } from "@/components/ui/page-card";
import type { MemberRow, ClassRow } from "@/lib/data/types";
import { classDisplayName } from "@/lib/data/types";
import { whatsappLink, smsLink, telLink, hasPhone } from "@/lib/data/contact";

const AR_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

export default function BirthdaysPage() {
  const supabase = useMemo(() => createClient(), []);

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [month, setMonth] = useState(new Date().getMonth());
  const [classFilter, setClassFilter] = useState("");

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    const [m, c] = await Promise.all([
      supabase.from("members").select("*"),
      supabase.from("classes").select("*"),
    ]);
    setMembers((m.data as MemberRow[]) ?? []);
    setClasses((c.data as ClassRow[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const classNames = useMemo(() => {
    const map = new Map<string, string>();
    classes.forEach((c) => map.set(c.id, classDisplayName(c)));
    return map;
  }, [classes]);

  // ------- قائمة أعياد الميلاد للشهر المحدد -------
  const list = useMemo(() => {
    let l = members.filter(
      (m) => m.birth_date && new Date(m.birth_date).getMonth() === month
    );
    if (classFilter) l = l.filter((m) => m.class_id === classFilter);
    return l.sort(
      (a, b) =>
        new Date(a.birth_date!).getDate() - new Date(b.birth_date!).getDate()
    );
  }, [members, month, classFilter]);

  // ملخص حسب الفصل
  const byClass = useMemo(() => {
    const map = new Map<string, number>();
    list.forEach((m) => {
      const name = m.class_id ? classNames.get(m.class_id) ?? "بدون فصل" : "بدون فصل";
      map.set(name, (map.get(name) ?? 0) + 1);
    });
    return Array.from(map.entries());
  }, [list, classNames]);

  const today = new Date();
  const shiftMonth = (d: number) => setMonth((m) => (m + d + 12) % 12);

  const bdayMsg = (m: MemberRow) =>
    `كل سنة وأنت طيب يا ${m.name.split(" ")[0]} 🎂🎉 ربنا يبارك حياتك`;

  return (
    <div>
      <PageHero
        title="أعياد الميلاد"
        subtitle="تهنئة المخدومين بأعياد ميلادهم"
        icon={Cake}
        grad="grad-accent"
      />

      {!isSupabaseConfigured && (
        <Card className="mb-4 text-center text-sm text-ink-muted">
          يلزم إعداد Supabase أولاً لاستخدام هذه الصفحة.
        </Card>
      )}

      {/* اختيار الشهر */}
      <Card className="mb-4">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => shiftMonth(-1)}
            className="grid h-10 w-10 place-items-center rounded-xl bg-surface-muted text-ink active:scale-95"
            title="الشهر السابق"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="text-center">
            <p className="text-lg font-bold text-ink">{AR_MONTHS[month]}</p>
            <p className="text-xs text-ink-muted">{list.length} عيد ميلاد</p>
          </div>
          <button
            onClick={() => shiftMonth(1)}
            className="grid h-10 w-10 place-items-center rounded-xl bg-surface-muted text-ink active:scale-95"
            title="الشهر التالي"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setMonth(today.getMonth())}
            className="flex items-center gap-1.5 rounded-xl bg-surface-muted px-3 py-2 text-xs font-bold text-ink active:scale-95"
          >
            <CalendarDays className="h-4 w-4" />
            الشهر الحالي
          </button>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="flex-1 rounded-xl border border-white/40 bg-surface-muted px-3 py-2 text-xs font-semibold text-ink outline-none"
          >
            <option value="">كل الفصول</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {classDisplayName(c)}
              </option>
            ))}
          </select>
        </div>

        {/* ملخص حسب الفصل */}
        {byClass.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {byClass.map(([name, n]) => (
              <span
                key={name}
                className="rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-bold text-primary"
              >
                {name}: {n}
              </span>
            ))}
          </div>
        )}
      </Card>

      {loading ? (
        <Card className="grid place-items-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </Card>
      ) : list.length === 0 ? (
        <Card className="py-10 text-center">
          <Cake className="mx-auto mb-2 h-10 w-10 text-ink-muted" />
          <p className="text-sm font-semibold text-ink">لا توجد أعياد ميلاد في {AR_MONTHS[month]}</p>
        </Card>
      ) : (
        <div className="space-y-2.5 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
          {list.map((m) => {
            const d = new Date(m.birth_date!);
            const isToday =
              d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
            const cName = m.class_id
              ? classNames.get(m.class_id) ?? "بدون فصل"
              : "بدون فصل";
            const msg = bdayMsg(m);
            return (
              <Card
                key={m.id}
                className={`flex items-center gap-3 ${
                  isToday ? "ring-2 ring-amber-400" : ""
                }`}
              >
                <div
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-extrabold ${
                    isToday ? "grad-amber text-white shadow-soft" : "bg-surface-muted text-amber-600"
                  }`}
                >
                  {d.getDate()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-bold text-ink">
                    <span className="truncate">{m.name}</span>
                    {isToday && (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        اليوم 🎉
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-ink-muted">
                    {cName} · {d.getDate()}/{d.getMonth() + 1}/{d.getFullYear()}
                  </p>
                </div>
                {hasPhone(m.phone) ? (
                  <div className="flex shrink-0 gap-1.5">
                    <a
                      href={whatsappLink(m.phone, msg)}
                      target="_blank"
                      rel="noreferrer"
                      className="grid h-9 w-9 place-items-center rounded-lg bg-green-100 text-green-700 active:scale-95"
                      title="تهنئة واتساب"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </a>
                    <a
                      href={telLink(m.phone)}
                      className="grid h-9 w-9 place-items-center rounded-lg bg-sky-100 text-sky-700 active:scale-95"
                      title="اتصال"
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                    <a
                      href={smsLink(m.phone, msg)}
                      className="grid h-9 w-9 place-items-center rounded-lg bg-violet-100 text-violet-700 active:scale-95"
                      title="SMS"
                    >
                      <MessageSquareText className="h-4 w-4" />
                    </a>
                  </div>
                ) : (
                  <span className="flex shrink-0 items-center gap-1 text-[10px] text-ink-muted">
                    <PhoneOff className="h-3.5 w-3.5" />
                    بدون هاتف
                  </span>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
