"use client";

/**
 * صفحة الرسائل الجماعية — إرسال واتساب / SMS لمجموعة مخدومين
 * مع متغيّرات نصية وفلاتر للفئة المستهدفة، وإرسال واحداً تلو الآخر.
 * تُفتح من القائمة الجانبية فقط (وليست في الشريط السفلي).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Send,
  MessageCircle,
  MessageSquareText,
  Eye,
  Users,
  Loader2,
  ChevronLeft,
  Check,
  SkipForward,
  X,
} from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { PageHero, Card } from "@/components/ui/page-card";
import type { MemberRow, ClassRow } from "@/lib/data/types";
import { classDisplayName } from "@/lib/data/types";
import { whatsappLink, smsLink, hasPhone } from "@/lib/data/contact";
import { useSelectedDate } from "@/context/selected-date-context";

type Channel = "whatsapp" | "sms";

type Audience =
  | "all"
  | "present_today"
  | "absent_today"
  | "never_attended"
  | "male"
  | "female"
  | "birthday_this_month";

const AUDIENCES: { key: Audience; label: string }[] = [
  { key: "all", label: "كل المخدومين" },
  { key: "present_today", label: "🟢 الحاضرون بالتاريخ المحدد" },
  { key: "absent_today", label: "🔴 الغائبون بالتاريخ المحدد" },
  { key: "never_attended", label: "لم يحضروا أبداً" },
  { key: "male", label: "الأولاد فقط" },
  { key: "female", label: "البنات فقط" },
  { key: "birthday_this_month", label: "🎂 عيد ميلادهم هذا الشهر" },
];

const VARS: { key: string; label: string }[] = [
  { key: "{name}", label: "الاسم الكامل" },
  { key: "{first_name}", label: "الاسم الأول" },
  { key: "{class}", label: "الفصل" },
  { key: "{balance}", label: "الرصيد" },
];

const DEFAULT_MSG = "سلام ونعمة يا {first_name}، نراك في الكنيسة الأحد القادم 🙏";

export default function MessengerPage() {
  const supabase = useMemo(() => createClient(), []);
  const { date } = useSelectedDate();

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [presentIds, setPresentIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [audience, setAudience] = useState<Audience>("all");
  const [classFilter, setClassFilter] = useState("");
  const [message, setMessage] = useState(DEFAULT_MSG);

  // طابور الإرسال
  const [queue, setQueue] = useState<MemberRow[] | null>(null);
  const [queueIndex, setQueueIndex] = useState(0);
  const [sentCount, setSentCount] = useState(0);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    const [m, c, a] = await Promise.all([
      supabase.from("members").select("*").order("name"),
      supabase.from("classes").select("*"),
      supabase.from("attendance_log").select("member_id").eq("attended_on", date),
    ]);
    setMembers((m.data as MemberRow[]) ?? []);
    setClasses((c.data as ClassRow[]) ?? []);
    setPresentIds(
      new Set(((a.data as { member_id: string }[]) ?? []).map((r) => r.member_id))
    );
    setLoading(false);
  }, [supabase, date]);

  useEffect(() => {
    load();
  }, [load]);

  const classNames = useMemo(() => {
    const map = new Map<string, string>();
    classes.forEach((c) => map.set(c.id, classDisplayName(c)));
    return map;
  }, [classes]);

  // ------- المستلمون بعد الفلاتر -------
  const recipients = useMemo(() => {
    let list = members.filter((m) => hasPhone(m.phone));
    if (classFilter) list = list.filter((m) => m.class_id === classFilter);
    const month = new Date().getMonth();
    switch (audience) {
      case "present_today":
        list = list.filter((m) => presentIds.has(m.id));
        break;
      case "absent_today":
        list = list.filter((m) => !presentIds.has(m.id));
        break;
      case "never_attended":
        list = list.filter((m) => (m.attendance_count ?? 0) === 0);
        break;
      case "male":
        list = list.filter((m) => m.gender === "male");
        break;
      case "female":
        list = list.filter((m) => m.gender === "female");
        break;
      case "birthday_this_month":
        list = list.filter(
          (m) => m.birth_date && new Date(m.birth_date).getMonth() === month
        );
        break;
    }
    return list;
  }, [members, classFilter, audience, presentIds]);

  // ------- استبدال المتغيرات -------
  const fill = useCallback(
    (tpl: string, m: MemberRow): string =>
      tpl
        .replaceAll("{name}", m.name)
        .replaceAll("{first_name}", m.name.split(" ")[0] ?? m.name)
        .replaceAll("{class}", m.class_id ? classNames.get(m.class_id) ?? "" : "")
        .replaceAll("{balance}", String(m.opening_balance ?? 0)),
    [classNames]
  );

  const previewMember = recipients[0];

  // ------- الإرسال -------
  const startSend = () => {
    if (!recipients.length || !message.trim()) return;
    setQueue(recipients);
    setQueueIndex(0);
    setSentCount(0);
  };

  const current = queue?.[queueIndex] ?? null;

  const sendCurrent = () => {
    if (!current) return;
    const body = fill(message, current);
    const url =
      channel === "whatsapp"
        ? whatsappLink(current.phone, body)
        : smsLink(current.phone, body);
    if (url) window.open(url, "_blank");
    setSentCount((n) => n + 1);
    advance();
  };

  const advance = () => {
    if (!queue) return;
    if (queueIndex + 1 >= queue.length) {
      setQueue(null); // انتهى
    } else {
      setQueueIndex((i) => i + 1);
    }
  };

  const insertVar = (v: string) => setMessage((m) => m + v);

  return (
    <div>
      <PageHero
        title="الرسائل الجماعية"
        subtitle="إرسال واتساب أو SMS لمجموعة مخدومين"
        icon={Send}
        grad="grad-teal"
      />

      {!isSupabaseConfigured && (
        <Card className="mb-4 text-center text-sm text-ink-muted">
          يلزم إعداد Supabase أولاً لاستخدام هذه الصفحة.
        </Card>
      )}

      {loading ? (
        <Card className="grid place-items-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </Card>
      ) : (
        <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
          {/* ------- الإعدادات ------- */}
          <Card>
            {/* القناة */}
            <label className="mb-1 block text-xs font-bold text-ink-muted">القناة</label>
            <div className="mb-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => setChannel("whatsapp")}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition active:scale-95 ${
                  channel === "whatsapp"
                    ? "grad-green text-white shadow-soft"
                    : "bg-surface-muted text-ink-muted"
                }`}
              >
                <MessageCircle className="h-4 w-4" />
                واتساب
              </button>
              <button
                onClick={() => setChannel("sms")}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition active:scale-95 ${
                  channel === "sms"
                    ? "grad-violet text-white shadow-soft"
                    : "bg-surface-muted text-ink-muted"
                }`}
              >
                <MessageSquareText className="h-4 w-4" />
                SMS
              </button>
            </div>

            {/* الفئة المستهدفة */}
            <label className="mb-1 block text-xs font-bold text-ink-muted">الفئة المستهدفة</label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value as Audience)}
              className="mb-3 w-full rounded-xl border border-white/40 bg-surface-muted px-3 py-2.5 text-sm text-ink outline-none"
            >
              {AUDIENCES.map((a) => (
                <option key={a.key} value={a.key}>
                  {a.label}
                </option>
              ))}
            </select>

            {/* الفصل */}
            <label className="mb-1 block text-xs font-bold text-ink-muted">الفصل (اختياري)</label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="mb-4 w-full rounded-xl border border-white/40 bg-surface-muted px-3 py-2.5 text-sm text-ink outline-none"
            >
              <option value="">كل الفصول</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {classDisplayName(c)}
                </option>
              ))}
            </select>

            {/* عدد المستلمين */}
            <div className="flex items-center gap-2 rounded-xl bg-teal-50 p-3 text-sm font-bold text-teal-700">
              <Users className="h-5 w-5" />
              {recipients.length} مستلم لديهم هاتف
            </div>
          </Card>

          {/* ------- الرسالة ------- */}
          <Card>
            <label className="mb-1 block text-xs font-bold text-ink-muted">
              المتغيرات — اضغط للإدراج
            </label>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {VARS.map((v) => (
                <button
                  key={v.key}
                  onClick={() => insertVar(v.key)}
                  className="rounded-full bg-surface-muted px-3 py-1.5 text-[11px] font-bold text-ink transition active:scale-95"
                >
                  {v.label}
                </button>
              ))}
            </div>

            <label className="mb-1 block text-xs font-bold text-ink-muted">نص الرسالة</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="mb-3 w-full resize-y rounded-xl border border-white/40 bg-surface-muted px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/40"
            />

            {/* معاينة */}
            {previewMember && (
              <div className="mb-4">
                <label className="mb-1 flex items-center gap-1 text-xs font-bold text-ink-muted">
                  <Eye className="h-3.5 w-3.5" />
                  معاينة (أول مستلم: {previewMember.name.split(" ")[0]})
                </label>
                <div className="whitespace-pre-line rounded-xl bg-green-50 p-3 text-sm text-green-900 ring-1 ring-green-200">
                  {fill(message, previewMember)}
                </div>
              </div>
            )}

            <button
              onClick={startSend}
              disabled={!recipients.length || !message.trim()}
              className="btn-gradient flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold shadow-soft active:scale-95 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              بدء الإرسال ({recipients.length})
            </button>
            <p className="mt-2 text-center text-[11px] text-ink-muted">
              سيُفتح تطبيق {channel === "whatsapp" ? "واتساب" : "الرسائل"} لكل مستلم على حدة —
              أرسل ثم عُد للمتابعة.
            </p>
          </Card>
        </div>
      )}

      {/* ---------- مودال طابور الإرسال ---------- */}
      {queue && current && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-surface p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold text-ink">
                إرسال {queueIndex + 1} من {queue.length}
              </h3>
              <button
                onClick={() => setQueue(null)}
                className="grid h-8 w-8 place-items-center rounded-lg bg-surface-muted text-ink"
                title="إيقاف"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* شريط تقدّم */}
            <div className="mb-4 h-2 overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full grad-teal transition-all"
                style={{ width: `${((queueIndex + 1) / queue.length) * 100}%` }}
              />
            </div>

            <div className="mb-4 rounded-xl bg-surface-muted p-3">
              <p className="font-bold text-ink">{current.name}</p>
              <p className="text-xs text-ink-muted" dir="ltr">
                {current.phone}
              </p>
              <p className="mt-2 whitespace-pre-line rounded-lg bg-surface p-2 text-xs text-ink">
                {fill(message, current)}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={sendCurrent}
                className="grad-green flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-soft active:scale-95"
              >
                {channel === "whatsapp" ? (
                  <MessageCircle className="h-4 w-4" />
                ) : (
                  <MessageSquareText className="h-4 w-4" />
                )}
                إرسال
              </button>
              <button
                onClick={advance}
                className="flex items-center justify-center gap-1 rounded-xl bg-surface-muted px-4 py-3 text-sm font-bold text-ink active:scale-95"
                title="تخطي"
              >
                <SkipForward className="h-4 w-4" />
                تخطي
              </button>
            </div>
            <p className="mt-3 text-center text-[11px] text-ink-muted">
              تم الإرسال حتى الآن: {sentCount}
            </p>
          </div>
        </div>
      )}

      {/* اكتمال الإرسال */}
      {queue === null && sentCount > 0 && (
        <div className="fixed bottom-24 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-xl bg-ink px-4 py-2 text-sm font-bold text-white shadow-2xl">
          <Check className="h-4 w-4 text-green-400" />
          تم إرسال {sentCount} رسالة
          <button onClick={() => setSentCount(0)} className="text-white/60">
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
