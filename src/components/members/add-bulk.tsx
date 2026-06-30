"use client";

import { useState, useMemo } from "react";
import { Loader2, Check, ClipboardPaste, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSettings } from "@/context/settings-context";
import { generateMemberCode, isValidPhone, Gender } from "@/lib/data/types";

type ClassOpt = { id: string; name: string };

type ParsedRow = {
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
  opening_balance: number;
};

/**
 * Bulk add via paste from a table (Excel/Sheets). Expected columns per row
 * (tab or comma separated), in the SAME order as single add:
 *   name1  name2  name3  name4  phone  day  month  year  address  notes  balance
 * Missing trailing columns are fine.
 */
function parsePaste(text: string): ParsedRow[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const cells = line.split(/\t|,/).map((c) => c.trim());
      const num = (s: string | undefined) => {
        const n = s ? parseInt(s, 10) : NaN;
        return Number.isFinite(n) ? n : null;
      };
      return {
        name1: cells[0] ?? "",
        name2: cells[1] ?? "",
        name3: cells[2] ?? "",
        name4: cells[3] ?? "",
        phone: (cells[4] ?? "").replace(/\D/g, "").slice(0, 11),
        birth_day: num(cells[5]),
        birth_month: num(cells[6]),
        birth_year: num(cells[7]),
        address: cells[8] ?? "",
        notes: cells[9] ?? "",
        opening_balance: cells[10] ? parseFloat(cells[10]) || 0 : 0,
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

  const input =
    "w-full rounded-2xl border border-primary-soft bg-surface-muted px-4 py-2.5 text-ink outline-none focus:border-primary";

  const handleSave = async () => {
    setError(null);
    setResult(null);
    const valid = rows.filter((r) => r.name1);
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
    // unique codes: base ms + index to avoid collisions in same millisecond
    const base = Date.now();
    const payload = valid.map((r, i) => ({
      code: `${(branding.codeWord || "StMary").replace(/\s+/g, "")}${base + i}`,
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
          <span dir="ltr" className="font-mono">
            الاسم1 | الاسم2 | الاسم3 | الاسم4 | تليفون | يوم | شهر | سنة | العنوان | ملاحظات | الرصيد
          </span>
        </p>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={6}
          dir="ltr"
          placeholder={"مينا\tعادل\tسمير\tفهمي\t01012345678\t12\t5\t2010\tطنطا\t-\t0"}
          className={input + " resize-none font-mono text-xs"}
        />
        {rows.length > 0 && (
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-primary">
              {rows.filter((r) => r.name1).length} صف جاهز
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
        {saving ? "جارٍ الحفظ..." : `إضافة ${rows.filter((r) => r.name1).length || ""} مخدوم`}
      </button>
    </div>
  );
}
