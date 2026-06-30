"use client";

import { useState, useMemo } from "react";
import { Loader2, Check, ClipboardPaste, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSettings } from "@/context/settings-context";
import {
  isValidPhone,
  Gender,
  splitName,
  parseDateString,
} from "@/lib/data/types";

type ClassOpt = { id: string; name: string };

type ParsedRow = {
  code: string; // provided code (optional; generated if empty)
  fullName: string; // raw single-cell name
  name1: string;
  name2: string;
  name3: string;
  name4: string;
  phone: string;
  birth_day: number | null;
  birth_month: number | null;
  birth_year: number | null;
  address: string;
  notes: string;
  photo_url: string;
  opening_balance: number;
};

/**
 * Bulk add via paste from a table (Excel/Sheets). Expected columns per row
 * (tab or comma separated), in this order:
 *   الكود | الاسم رباعي | رقم التليفون | تاريخ الميلاد | العنوان | ملاحظات | صورة | الرصيد
 * Example:
 *   StMary1759503656922  كيفين بيشوى اسعد  01273447740  2022-04-02  المنشيه    105
 * The name is a single cell (auto-split into 4 parts). Date is a single cell
 * (YYYY-MM-DD or D/M/YYYY). Missing trailing columns are fine.
 */
function parsePaste(text: string): ParsedRow[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      // split on TAB only when present (preserves names with internal commas);
      // otherwise fall back to comma.
      const cells = (line.includes("\t") ? line.split("\t") : line.split(",")).map(
        (c) => c.trim()
      );
      const fullName = cells[1] ?? "";
      const [name1, name2, name3, name4] = splitName(fullName);
      const dob = parseDateString(cells[3] ?? "");
      return {
        code: cells[0] ?? "",
        fullName,
        name1,
        name2,
        name3,
        name4,
        phone: (cells[2] ?? "").replace(/\D/g, "").slice(0, 11),
        birth_day: dob.day,
        birth_month: dob.month,
        birth_year: dob.year,
        address: cells[4] ?? "",
        notes: cells[5] ?? "",
        photo_url: cells[6] ?? "",
        opening_balance: cells[7] ? parseFloat(cells[7]) || 0 : 0,
      };
    });
}

export function AddBulk({ classes }: { classes: ClassOpt[] }) {
  const { branding } = useSettings();
  const [raw, setRaw] = useState("");
  const [gender, setGender] = useState<Gender>("male");
  const [classId, setClassId] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(() => parsePaste(raw), [raw]);
  const invalidPhones = rows.filter((r) => r.phone && !isValidPhone(r.phone)).length;
  const readyCount = rows.filter((r) => r.fullName.trim()).length;

  const input =
    "w-full rounded-2xl border border-primary-soft bg-surface-muted px-4 py-2.5 text-ink outline-none focus:border-primary";

  const handleSave = async () => {
    setError(null);
    setResult(null);
    const valid = rows.filter((r) => r.fullName.trim());
    if (valid.length === 0) {
      setError("لا توجد صفوف صالحة. الصق البيانات أولاً.");
      return;
    }
    if (invalidPhones > 0) {
      setError(`يوجد ${invalidPhones} رقم تليفون غير صحيح (11 رقماً يبدأ بـ 0).`);
      return;
    }
    setSaving(true);
    const supabase = createClient();
    // unique codes: use provided code, else generate base ms + index to avoid
    // collisions within the same millisecond.
    const prefix = (branding.codeWord || "StMary").replace(/\s+/g, "");
    const base = Date.now();
    const payload = valid.map((r, i) => ({
      code: r.code.trim() || `${prefix}${base + i}`,
      name1: r.name1,
      name2: r.name2,
      name3: r.name3,
      name4: r.name4,
      phone: r.phone || null,
      birth_day: r.birth_day,
      birth_month: r.birth_month,
      birth_year: r.birth_year,
      address: r.address || null,
      notes: r.notes || null,
      photo_url: r.photo_url.trim() || null,
      opening_balance: r.opening_balance,
      gender,
      class_id: classId || null,
    }));
    try {
      const { error: err } = await supabase.from("members").insert(payload);
      if (err) throw err;
      setResult(`تمت إضافة ${payload.length} مخدوم بنجاح.`);
      setRaw("");
    } catch {
      setError("تعذّر حفظ البيانات.");
    } finally {
      setSaving(false);
    }
  };

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
          الكود اختياري (يُولَّد تلقائياً لو فاضي) • تاريخ الميلاد مثل
          {" "}
          <span dir="ltr" className="font-mono">2022-04-02</span>
        </p>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
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
              {readyCount} صف جاهز
              {invalidPhones > 0 && ` • ${invalidPhones} تليفون خطأ`}
            </span>
            <button
              onClick={() => setRaw("")}
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

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex w-full items-center justify-center gap-2 rounded-2xl btn-gradient py-3.5 text-sm font-bold text-white shadow-soft active:scale-95 disabled:opacity-70"
      >
        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
        {saving ? "جارٍ الحفظ..." : `إضافة ${readyCount || ""} مخدوم`}
      </button>
    </div>
  );
}
