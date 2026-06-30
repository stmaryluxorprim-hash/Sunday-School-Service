"use client";

import { useState, useMemo } from "react";
import { Loader2, Check, ClipboardPaste, Trash2, Eye, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSettings } from "@/context/settings-context";
import {
  isValidPhone,
  normalizePhone,
  phoneForStorage,
  parseDateCell,
  Gender,
} from "@/lib/data/types";

type ClassOpt = { id: string; name: string };

type ParsedRow = {
  code: string | null; // provided code (null if empty -> generated on save)
  name: string | null; // single name cell
  phoneLocal: string | null; // normalized 11-digit local (null if empty)
  phoneInvalid: boolean; // entered but couldn't normalize to valid
  birth_date: string | null; // ISO or null
  address: string | null;
  notes: string | null;
  photo_url: string | null;
  opening_balance: number | null;
};

/** empty cell -> null (never store empty strings). */
const orNull = (s: string | undefined) => {
  const t = (s ?? "").trim();
  return t ? t : null;
};

/**
 * Paste columns (tab or comma separated), in this order:
 *   الكود | الاسم رباعي | رقم التليفون | تاريخ الميلاد | العنوان | ملاحظات | صورة | الرصيد
 * Example:
 *   StMary1759503656922  كيفين بيشوى اسعد  01273447740  2022-04-02  المنشيه    105
 */
function parsePaste(text: string): ParsedRow[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+$/, ""))
    .filter((l) => l.trim().length > 0)
    .map((line) => {
      const cells = (line.includes("\t") ? line.split("\t") : line.split(",")).map(
        (c) => c.trim()
      );
      const phoneRaw = orNull(cells[2]);
      const phoneLocal = phoneRaw ? normalizePhone(phoneRaw) : null;
      const balRaw = orNull(cells[7]);
      return {
        code: orNull(cells[0]),
        name: orNull(cells[1]),
        phoneLocal: phoneLocal || null,
        phoneInvalid: !!phoneRaw && !isValidPhone(phoneLocal || ""),
        birth_date: parseDateCell(cells[3] ?? ""),
        address: orNull(cells[4]),
        notes: orNull(cells[5]),
        photo_url: orNull(cells[6]),
        opening_balance: balRaw !== null ? parseFloat(balRaw) || 0 : null,
      };
    });
}

export function AddBulk({ classes }: { classes: ClassOpt[] }) {
  const { branding } = useSettings();
  const [raw, setRaw] = useState("");
  const [gender, setGender] = useState<Gender>("male");
  const [classId, setClassId] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(() => parsePaste(raw), [raw]);
  const valid = rows.filter((r) => r.name);
  const invalidPhones = rows.filter((r) => r.phoneInvalid).length;

  const input =
    "w-full rounded-2xl border border-primary-soft bg-surface-muted px-4 py-2.5 text-ink outline-none focus:border-primary";

  const handleReview = () => {
    setError(null);
    setResult(null);
    if (valid.length === 0) {
      setError("لا توجد صفوف صالحة. الصق البيانات أولاً (الاسم مطلوب).");
      return;
    }
    setShowPreview(true);
  };

  const handleSave = async () => {
    setError(null);
    setResult(null);
    if (valid.length === 0) {
      setError("لا توجد صفوف صالحة.");
      return;
    }
    if (invalidPhones > 0) {
      setError(`يوجد ${invalidPhones} رقم تليفون غير صحيح. صحّحه أو امسحه قبل الحفظ.`);
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const prefix = (branding.codeWord || "StMary").replace(/\s+/g, "");
    const base = Date.now();
    const payload = valid.map((r, i) => ({
      code: r.code || `${prefix}${base + i}`,
      name: r.name,
      phone: r.phoneLocal ? phoneForStorage(r.phoneLocal) : null, // +2 + 11
      birth_date: r.birth_date,
      address: r.address,
      notes: r.notes,
      photo_url: r.photo_url,
      opening_balance: r.opening_balance ?? 0,
      gender,
      class_id: classId || null,
    }));
    try {
      const { error: err } = await supabase.from("members").insert(payload);
      if (err) throw err;
      setResult(`تمت إضافة ${payload.length} مخدوم بنجاح.`);
      setRaw("");
      setShowPreview(false);
    } catch {
      setError("تعذّر حفظ البيانات.");
    } finally {
      setSaving(false);
    }
  };

  const className = classes.find((c) => c.id === classId)?.name ?? "بدون فصل";

  return (
    <div className="space-y-3">
      <div className="animate-fade-up rounded-3xl bg-surface p-4 shadow-card border border-white/40">
        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
          <ClipboardPaste className="h-4 w-4 text-primary" /> الصق البيانات من جدول
        </div>
        <p className="mb-2 text-[11px] leading-relaxed text-ink-muted">
          كل سطر = مخدوم. الأعمدة بالترتيب (مفصولة بـ Tab أو فاصلة):<br />
          <span className="font-semibold text-ink">
            الكود | الاسم رباعي | رقم التليفون | تاريخ الميلاد | العنوان | ملاحظات | صورة | الرصيد
          </span>
          <br />
          الخانة الفاضية تُترك فارغة (null) • الكود اختياري • تاريخ الميلاد مثل
          {" "}
          <span dir="ltr" className="font-mono">2022-04-02</span>
        </p>
        <textarea
          value={raw}
          onChange={(e) => {
            setRaw(e.target.value);
            setShowPreview(false);
          }}
          rows={6}
          dir="ltr"
          placeholder={
            "StMary1759503656922\tكيفين بيشوى اسعد\t01273447740\t2022-04-02\tالمنشيه\t\t\t105"
          }
          className={input + " resize-none font-mono text-xs"}
        />
        {rows.length > 0 && (
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-primary">
              {valid.length} صف جاهز
              {invalidPhones > 0 && ` • ${invalidPhones} تليفون خطأ`}
            </span>
            <button
              onClick={() => {
                setRaw("");
                setShowPreview(false);
              }}
              className="flex items-center gap-1 text-ink-muted active:scale-95"
            >
              <Trash2 className="h-3.5 w-3.5" /> مسح
            </button>
          </div>
        )}
      </div>

      {/* apply-to-all: gender + class */}
      <div className="animate-fade-up space-y-3 rounded-3xl bg-surface p-4 shadow-card border border-white/40">
        <p className="text-xs font-semibold text-ink-muted">يُطبّق على كل المضافين:</p>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-muted">النوع (الكل)</label>
          <div className="flex gap-2">
            {(["male", "female"] as Gender[]).map((g) => (
              <button
                key={g}
                onClick={() => setGender(g)}
                className={`flex-1 rounded-2xl py-2.5 text-sm font-semibold transition active:scale-95 ${
                  gender === g ? "btn-gradient text-white" : "bg-surface-muted text-ink-muted"
                }`}
              >
                {g === "male" ? "كلهم أولاد" : "كلهم بنات"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-muted">الفصل (الكل)</label>
          <select value={classId} onChange={(e) => setClassId(e.target.value)} className={input}>
            <option value="">بدون فصل</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-accent-soft px-4 py-2.5 text-sm font-semibold text-accent">
          {error}
        </div>
      )}
      {result && (
        <div className="rounded-2xl bg-primary-soft px-4 py-2.5 text-sm font-semibold text-primary">
          {result}
        </div>
      )}

      {/* Step 1: review button (shows preview) */}
      {!showPreview ? (
        <button
          onClick={handleReview}
          className="flex w-full items-center justify-center gap-2 rounded-2xl btn-gradient py-3.5 text-sm font-bold text-white shadow-soft active:scale-95"
        >
          <Eye className="h-5 w-5" /> مراجعة البيانات ({valid.length})
        </button>
      ) : (
        <BulkPreview
          rows={valid}
          gender={gender}
          className={className}
          invalidPhones={invalidPhones}
          saving={saving}
          onBack={() => setShowPreview(false)}
          onConfirm={handleSave}
        />
      )}
    </div>
  );
}

function BulkPreview({
  rows,
  gender,
  className,
  invalidPhones,
  saving,
  onBack,
  onConfirm,
}: {
  rows: ParsedRow[];
  gender: Gender;
  className: string;
  invalidPhones: number;
  saving: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="animate-fade-up space-y-3 rounded-3xl bg-surface p-4 shadow-card border border-white/40">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink">مراجعة قبل الحفظ ({rows.length})</h3>
        <button
          onClick={onBack}
          className="flex items-center gap-1 rounded-xl bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink active:scale-95"
        >
          <ChevronRight className="h-4 w-4" /> رجوع للتعديل
        </button>
      </div>

      <p className="text-[11px] text-ink-muted">
        الكل: <span className="font-semibold text-ink">{gender === "male" ? "أولاد" : "بنات"}</span>
        {" • "}الفصل: <span className="font-semibold text-ink">{className}</span>
      </p>

      {invalidPhones > 0 && (
        <div className="rounded-2xl bg-accent-soft px-3 py-2 text-[11px] font-semibold text-accent">
          ⚠️ يوجد {invalidPhones} رقم تليفون غير صحيح (مظلّل بالأحمر) — صحّحه قبل الحفظ.
        </div>
      )}

      {/* table preview */}
      <div className="overflow-x-auto rounded-2xl border border-primary-soft">
        <table className="w-full min-w-[640px] text-right text-xs">
          <thead className="bg-surface-muted text-ink-muted">
            <tr>
              <th className="px-2 py-2 font-semibold">#</th>
              <th className="px-2 py-2 font-semibold">الاسم</th>
              <th className="px-2 py-2 font-semibold">التليفون</th>
              <th className="px-2 py-2 font-semibold">الميلاد</th>
              <th className="px-2 py-2 font-semibold">العنوان</th>
              <th className="px-2 py-2 font-semibold">ملاحظات</th>
              <th className="px-2 py-2 font-semibold">الرصيد</th>
              <th className="px-2 py-2 font-semibold">الكود</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary-soft/50">
            {rows.map((r, i) => (
              <tr key={i} className="text-ink">
                <td className="px-2 py-2 text-ink-muted">{i + 1}</td>
                <td className="px-2 py-2 font-semibold">{r.name}</td>
                <td
                  className={`px-2 py-2 ${r.phoneInvalid ? "font-bold text-accent" : ""}`}
                  dir="ltr"
                >
                  {r.phoneLocal ? `+2${r.phoneLocal}` : "—"}
                </td>
                <td className="px-2 py-2" dir="ltr">{r.birth_date ?? "—"}</td>
                <td className="px-2 py-2">{r.address ?? "—"}</td>
                <td className="px-2 py-2">{r.notes ?? "—"}</td>
                <td className="px-2 py-2" dir="ltr">{r.opening_balance ?? 0}</td>
                <td className="px-2 py-2 text-ink-muted" dir="ltr">
                  {r.code ?? "تلقائي"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={onConfirm}
        disabled={saving || invalidPhones > 0}
        className="flex w-full items-center justify-center gap-2 rounded-2xl btn-gradient py-3.5 text-sm font-bold text-white shadow-soft active:scale-95 disabled:opacity-60"
      >
        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
        {saving ? "جارٍ الحفظ..." : `تأكيد وحفظ ${rows.length} مخدوم`}
      </button>
    </div>
  );
}
