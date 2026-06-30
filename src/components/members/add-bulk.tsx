"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Loader2,
  Check,
  ClipboardPaste,
  Trash2,
  Plus,
  X,
  CheckCheck,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSettings } from "@/context/settings-context";
import {
  isValidPhone,
  normalizePhone,
  phoneForStorage,
  parseDateCell,
  Gender,
  DateOrder,
  dateOrderLabel,
} from "@/lib/data/types";

type ClassOpt = { id: string; name: string };

// One editable row in the bulk grid. Fields are kept as raw strings so the
// user can freely edit; conversion happens at save time.
type DraftRow = {
  uid: string;
  code: string;
  name: string;
  phone: string; // raw, normalized on save
  birth_date: string; // raw (YYYY-MM-DD or D/M/YYYY)
  dateOrder: DateOrder; // how to read the two non-year parts (per row)
  address: string;
  notes: string;
  photo_url: string;
  balance: string;
  gender: Gender;
  classId: string;
};

const orEmpty = (s: string | undefined) => (s ?? "").trim();
let _seq = 0;
const newUid = () => `r${Date.now()}_${_seq++}`;

/** Parse pasted text into draft rows (columns by Tab, fallback comma). */
function parsePaste(
  text: string,
  gender: Gender,
  classId: string,
  dateOrder: DateOrder
): DraftRow[] {
  return text
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0)
    .map((line) => {
      const cells = (line.includes("\t") ? line.split("\t") : line.split(",")).map(
        (c) => c.trim()
      );
      return {
        uid: newUid(),
        code: orEmpty(cells[0]),
        name: orEmpty(cells[1]),
        phone: orEmpty(cells[2]),
        birth_date: orEmpty(cells[3]),
        dateOrder,
        address: orEmpty(cells[4]),
        notes: orEmpty(cells[5]),
        photo_url: orEmpty(cells[6]),
        balance: orEmpty(cells[7]),
        gender,
        classId,
      };
    });
}

export function AddBulk({ classes }: { classes: ClassOpt[] }) {
  const { branding } = useSettings();

  const [raw, setRaw] = useState("");
  const [rows, setRows] = useState<DraftRow[]>([]);
  // "apply to all" defaults
  const [allGender, setAllGender] = useState<Gender>("male");
  const [allClass, setAllClass] = useState("");
  // default date order: month-before-day (mdy) as requested
  const [allDateOrder, setAllDateOrder] = useState<DateOrder>("mdy");

  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // when true, only rows that have a problem are shown in the list
  const [onlyProblems, setOnlyProblems] = useState(false);

  // Codes that already exist in the database (lower-cased for comparison).
  // A pasted/typed code that matches one of these is a duplicate and is
  // blocked + highlighted just like a bad phone or bad date.
  const [existingCodes, setExistingCodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("members")
      .select("code")
      .then(({ data }) => {
        const set = new Set<string>();
        (data as { code: string | null }[] | null)?.forEach((m) => {
          if (m.code) set.add(m.code.trim().toLowerCase());
        });
        setExistingCodes(set);
      });
  }, []);

  const input =
    "w-full rounded-xl border border-primary-soft bg-surface-muted px-3 py-2 text-sm text-ink outline-none focus:border-primary";

  // phone validity per row (raw -> normalized)
  const phoneBad = (r: DraftRow) =>
    r.phone.trim().length > 0 && !isValidPhone(normalizePhone(r.phone));

  // date validity per row: has text but doesn't parse to a valid ISO date
  // (parsed with that row's own chosen order)
  const dateBad = (r: DraftRow) =>
    r.birth_date.trim().length > 0 &&
    parseDateCell(r.birth_date, r.dateOrder) === null;

  // How many times each (non-empty) code appears within the current batch —
  // used to flag in-batch duplicates.
  const codeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach((r) => {
      const c = r.code.trim().toLowerCase();
      if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
    });
    return counts;
  }, [rows]);

  // A code is "bad" (duplicate) when it is non-empty AND either:
  //   - it already exists in the database, or
  //   - it appears more than once within this batch.
  const codeBad = (r: DraftRow) => {
    const c = r.code.trim().toLowerCase();
    if (!c) return false;
    return existingCodes.has(c) || (codeCounts.get(c) ?? 0) > 1;
  };

  // A class MUST be chosen for every row — a missing class is a problem.
  const classBad = (r: DraftRow) => !r.classId;

  // Whether a row has ANY problem (used by the "show only problems" filter).
  const rowHasProblem = (r: DraftRow) =>
    !r.name.trim() || phoneBad(r) || dateBad(r) || codeBad(r) || classBad(r);

  const invalidPhones = useMemo(() => rows.filter(phoneBad).length, [rows]);
  const invalidDates = useMemo(() => rows.filter(dateBad).length, [rows]);
  const missingName = useMemo(
    () => rows.filter((r) => !r.name.trim()).length,
    [rows]
  );
  const missingClass = useMemo(() => rows.filter(classBad).length, [rows]);
  const duplicateCodes = useMemo(
    () => rows.filter(codeBad).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, existingCodes, codeCounts]
  );
  const problemCount = useMemo(
    () => rows.filter(rowHasProblem).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, existingCodes, codeCounts]
  );

  const loadPaste = () => {
    setError(null);
    setResult(null);
    const parsed = parsePaste(raw, allGender, allClass, allDateOrder);
    if (parsed.length === 0) {
      setError("لا يوجد بيانات للّصق.");
      return;
    }
    // append to any existing rows so the user can paste multiple batches
    setRows((prev) => [...prev, ...parsed]);
    setRaw("");
  };

  const update = (uid: string, patch: Partial<DraftRow>) =>
    setRows((prev) => prev.map((r) => (r.uid === uid ? { ...r, ...patch } : r)));

  const removeRow = (uid: string) =>
    setRows((prev) => prev.filter((r) => r.uid !== uid));

  const addEmpty = () =>
    setRows((prev) => [
      ...prev,
      {
        uid: newUid(),
        code: "",
        name: "",
        phone: "",
        birth_date: "",
        address: "",
        notes: "",
        photo_url: "",
        balance: "",
        dateOrder: allDateOrder,
        gender: allGender,
        classId: allClass,
      },
    ]);

  const applyGenderAll = () =>
    setRows((prev) => prev.map((r) => ({ ...r, gender: allGender })));
  const applyClassAll = () =>
    setRows((prev) => prev.map((r) => ({ ...r, classId: allClass })));
  const applyDateOrderAll = () =>
    setRows((prev) => prev.map((r) => ({ ...r, dateOrder: allDateOrder })));

  const handleSave = async () => {
    setError(null);
    setResult(null);
    const valid = rows.filter((r) => r.name.trim());
    if (valid.length === 0) {
      setError("لا توجد صفوف صالحة. كل صف لازم يكون له اسم.");
      return;
    }
    if (invalidPhones > 0) {
      setError(`يوجد ${invalidPhones} رقم تليفون غير صحيح (مظلّل بالأحمر). صحّحه أو امسحه.`);
      return;
    }
    if (invalidDates > 0) {
      setError(
        `يوجد ${invalidDates} تاريخ ميلاد غير صحيح (مظلّل بالأحمر). الصيغة المقبولة: سنة-شهر-يوم أو يوم/شهر/سنة. صحّحه أو امسحه.`
      );
      return;
    }
    if (duplicateCodes > 0) {
      setError(
        `يوجد ${duplicateCodes} كود مكرّر (مظلّل بالأحمر) — إمّا مستخدم من قبل أو متكرّر داخل القائمة. غيّر الكود أو امسحه (اتركه فارغاً ليُولَّد تلقائياً).`
      );
      return;
    }
    if (missingClass > 0) {
      setError(
        `يوجد ${missingClass} صف بدون فصل (مظلّل بالأحمر). اختر فصلاً لكل صف أو استخدم «تطبيق على الكل».`
      );
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const prefix = (branding.codeWord || "StMary").replace(/\s+/g, "");
    const base = Date.now();
    // Always generate a guaranteed-unique code per row. We append the row index
    // (and the batch timestamp) so codes never collide within the batch — a
    // single duplicate code would otherwise make the whole insert fail (400).
    const payload = valid.map((r, i) => {
      const pastedCode = r.code.trim();
      return {
        // keep a pasted code only if present, else generate; always make unique
        code: pastedCode ? `${pastedCode}` : `${prefix}${base}${i}`,
        name: r.name.trim(),
        phone: r.phone.trim() ? phoneForStorage(r.phone) : null,
        birth_date: parseDateCell(r.birth_date, r.dateOrder),
        address: r.address.trim() || null,
        notes: r.notes.trim() || null,
        photo_url: r.photo_url.trim() || null,
        opening_balance: r.balance.trim() ? parseFloat(r.balance) || 0 : 0,
        gender: r.gender,
        class_id: r.classId || null,
      };
    });

    // Insert one row at a time so a single bad row (e.g. duplicate code) does
    // NOT abort the whole batch. We collect per-row failures and report them.
    let ok = 0;
    const failures: string[] = [];
    const insertedCodes: string[] = [];
    for (let i = 0; i < payload.length; i++) {
      const { error: err } = await supabase.from("members").insert(payload[i]);
      if (err) {
        failures.push(`صف ${i + 1} (${payload[i].name}): ${err.message}`);
      } else {
        ok += 1;
        insertedCodes.push(payload[i].code.trim().toLowerCase());
      }
    }
    setSaving(false);

    // Register the codes we just inserted so they are treated as "existing"
    // (prevents re-adding the same code in a later batch within this session).
    if (insertedCodes.length > 0) {
      setExistingCodes((prev) => {
        const next = new Set(prev);
        insertedCodes.forEach((c) => next.add(c));
        return next;
      });
    }

    if (ok > 0) {
      setResult(`تمت إضافة ${ok} مخدوم بنجاح.`);
      // remove the successfully-added rows, keep only the failed ones for fixing
      const failedNames = new Set(
        failures.map((f) => f.replace(/^صف \d+ \(/, "").replace(/\):.*$/, ""))
      );
      setRows((prev) => prev.filter((r) => failedNames.has(r.name.trim())));
    }
    if (failures.length > 0) {
      setError(
        `تعذّر حفظ ${failures.length} صف:\n${failures.slice(0, 5).join("\n")}` +
          (failures.length > 5 ? `\n… و${failures.length - 5} أخرى` : "")
      );
    } else if (ok === 0) {
      setError("لم تتم إضافة أي صف.");
    }
  };

  return (
    <div className="space-y-3">
      {/* paste box */}
      <div className="animate-fade-up rounded-3xl bg-surface p-4 shadow-card border border-white/40">
        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
          <ClipboardPaste className="h-4 w-4 text-primary" /> الصق البيانات من جدول
        </div>
        <p className="mb-2 text-[11px] leading-relaxed text-ink-muted">
          الأعمدة بالترتيب:{" "}
          <span className="font-semibold text-ink">
            الكود | الاسم رباعي | التليفون | تاريخ الميلاد | العنوان | ملاحظات | صورة | الرصيد
          </span>
          <br />
          الخانة الفاضية تُترك فارغة. تقدر تعدّل أي صف بعد اللصق.
        </p>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={4}
          dir="ltr"
          placeholder={"StMary1759503656922\tكيفين بيشوى اسعد\t01273447740\t2022-12-04\tالمنشيه\t\t\t105"}
          className={input + " resize-none font-mono text-xs"}
        />
        <div className="mt-2 flex gap-2">
          <button
            onClick={loadPaste}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl btn-gradient py-2.5 text-sm font-bold text-white shadow-soft active:scale-95"
          >
            <ClipboardPaste className="h-4 w-4" /> تحميل الملصوق
          </button>
          <button
            onClick={addEmpty}
            className="flex items-center justify-center gap-1 rounded-2xl bg-primary-soft px-4 py-2.5 text-sm font-bold text-primary active:scale-95"
          >
            <Plus className="h-4 w-4" /> صف فارغ
          </button>
        </div>
      </div>

      {/* apply-to-all controls */}
      <div className="animate-fade-up space-y-3 rounded-3xl bg-surface p-4 shadow-card border border-white/40">
        <p className="text-xs font-semibold text-ink-muted">تعيين سريع للكل:</p>
        {/* gender */}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold text-ink-muted">النوع</label>
            <div className="flex gap-2">
              {(["male", "female"] as Gender[]).map((g) => (
                <button
                  key={g}
                  onClick={() => setAllGender(g)}
                  className={`flex-1 rounded-2xl py-2 text-sm font-semibold transition active:scale-95 ${
                    allGender === g ? "btn-gradient text-white" : "bg-surface-muted text-ink-muted"
                  }`}
                >
                  {g === "male" ? "ذكر" : "أنثى"}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={applyGenderAll}
            disabled={rows.length === 0}
            className="flex items-center gap-1 rounded-2xl bg-primary-soft px-3 py-2 text-xs font-bold text-primary active:scale-95 disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" /> تطبيق على الكل
          </button>
        </div>
        {/* class */}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold text-ink-muted">الفصل</label>
            <select
              value={allClass}
              onChange={(e) => setAllClass(e.target.value)}
              className={input}
            >
              <option value="">بدون فصل</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={applyClassAll}
            disabled={rows.length === 0}
            className="flex items-center gap-1 rounded-2xl bg-primary-soft px-3 py-2 text-xs font-bold text-primary active:scale-95 disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" /> تطبيق على الكل
          </button>
        </div>
        {/* date order */}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold text-ink-muted">
              ترتيب التاريخ
            </label>
            <div className="flex gap-2">
              {(["mdy", "dmy"] as DateOrder[]).map((o) => (
                <button
                  key={o}
                  onClick={() => setAllDateOrder(o)}
                  className={`flex-1 rounded-2xl py-2 text-xs font-semibold transition active:scale-95 ${
                    allDateOrder === o ? "btn-gradient text-white" : "bg-surface-muted text-ink-muted"
                  }`}
                >
                  {o === "mdy" ? "شهر ثم يوم" : "يوم ثم شهر"}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={applyDateOrderAll}
            disabled={rows.length === 0}
            className="flex items-center gap-1 rounded-2xl bg-primary-soft px-3 py-2 text-xs font-bold text-primary active:scale-95 disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" /> تطبيق على الكل
          </button>
        </div>
        <p className="text-[10px] leading-relaxed text-ink-muted">
          الافتراضي: <span className="font-semibold text-ink">شهر ثم يوم</span> (مثل
          2023-12-21). لو بياناتك يوم ثم شهر بدّل الزر واضغط «تطبيق على الكل».
        </p>
      </div>

      {/* status messages */}
      {error && (
        <div className="flex items-start gap-2 rounded-2xl bg-accent-soft px-4 py-2.5 text-sm font-semibold text-accent">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="whitespace-pre-line break-words">{error}</span>
        </div>
      )}
      {result && (
        <div className="rounded-2xl bg-primary-soft px-4 py-2.5 text-sm font-semibold text-primary">
          {result}
        </div>
      )}

      {/* editable cards */}
      {rows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-semibold text-ink">
              {rows.length} صف
              {missingName > 0 && (
                <span className="text-accent"> • {missingName} بدون اسم</span>
              )}
              {invalidPhones > 0 && (
                <span className="text-accent"> • {invalidPhones} تليفون خطأ</span>
              )}
              {invalidDates > 0 && (
                <span className="text-accent"> • {invalidDates} تاريخ خطأ</span>
              )}
              {duplicateCodes > 0 && (
                <span className="text-accent"> • {duplicateCodes} كود مكرّر</span>
              )}
              {missingClass > 0 && (
                <span className="text-accent"> • {missingClass} بدون فصل</span>
              )}
            </p>
            <button
              onClick={() => setRows([])}
              className="flex items-center gap-1 text-xs text-ink-muted active:scale-95"
            >
              <Trash2 className="h-3.5 w-3.5" /> مسح الكل
            </button>
          </div>

          {/* show-only-problems toggle */}
          <label
            className={`flex cursor-pointer items-center justify-between rounded-2xl px-4 py-2.5 text-xs font-semibold transition ${
              onlyProblems ? "bg-accent-soft text-accent" : "bg-surface-muted text-ink-muted"
            }`}
          >
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              عرض الصفوف التي بها مشكلة فقط ({problemCount})
            </span>
            <span
              role="radio"
              aria-checked={onlyProblems}
              onClick={() => setOnlyProblems((v) => !v)}
              className={`relative grid h-5 w-5 place-items-center rounded-full border-2 transition ${
                onlyProblems ? "border-accent" : "border-ink-muted/40"
              }`}
            >
              {onlyProblems && <span className="h-2.5 w-2.5 rounded-full bg-accent" />}
            </span>
          </label>

          {onlyProblems && problemCount === 0 && (
            <div className="rounded-2xl bg-primary-soft px-4 py-2.5 text-sm font-semibold text-primary">
              لا توجد مشاكل — كل الصفوف سليمة.
            </div>
          )}

          {rows.map((r, idx) =>
            onlyProblems && !rowHasProblem(r) ? null : (
              <RowCard
                key={r.uid}
                row={r}
                index={idx + 1}
                classes={classes}
                phoneBad={phoneBad(r)}
                dateBad={dateBad(r)}
                codeBad={codeBad(r)}
                classBad={classBad(r)}
                onChange={(patch) => update(r.uid, patch)}
                onRemove={() => removeRow(r.uid)}
              />
            )
          )}
        </div>
      )}

      {/* save */}
      {rows.length > 0 && (
        <button
          onClick={handleSave}
          disabled={saving || problemCount > 0}
          className="flex w-full items-center justify-center gap-2 rounded-2xl btn-gradient py-3.5 text-sm font-bold text-white shadow-soft active:scale-95 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
          {saving ? "جارٍ الحفظ..." : `إضافة المجموعة (${rows.filter((r) => r.name.trim()).length})`}
        </button>
      )}
    </div>
  );
}

function RowCard({
  row,
  index,
  classes,
  phoneBad,
  dateBad,
  codeBad,
  classBad,
  onChange,
  onRemove,
}: {
  row: DraftRow;
  index: number;
  classes: ClassOpt[];
  phoneBad: boolean;
  dateBad: boolean;
  codeBad: boolean;
  classBad: boolean;
  onChange: (patch: Partial<DraftRow>) => void;
  onRemove: () => void;
}) {
  const field =
    "w-full rounded-xl border bg-surface-muted px-3 py-2 text-sm text-ink outline-none focus:border-primary";
  const ok = "border-primary-soft";
  const bad = "border-accent text-accent";

  // The whole row has a problem if the name is missing, the phone is invalid,
  // the birth date is invalid, the code is a duplicate, or no class is chosen.
  // When any of these is true we highlight the ENTIRE card in red.
  const nameBad = !row.name.trim();
  const hasProblem = nameBad || phoneBad || dateBad || codeBad || classBad;

  return (
    <div
      className={`animate-fade-up rounded-3xl p-3 shadow-card border transition-colors ${
        hasProblem
          ? "bg-accent-soft border-accent ring-2 ring-accent/60"
          : "bg-surface border-white/40"
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="grid h-6 min-w-6 place-items-center rounded-lg bg-primary-soft px-1.5 text-xs font-bold text-primary">
          {index}
        </span>
        <button
          onClick={onRemove}
          className="grid h-7 w-7 place-items-center rounded-lg bg-accent-soft text-accent active:scale-95"
          aria-label="حذف الصف"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* code spans both columns */}
        <div className="col-span-2">
          <label className="mb-1 block text-[10px] font-semibold text-ink-muted">
            الكود <span className="text-ink-muted/70">(اتركه فارغاً ليُولَّد تلقائياً)</span>
          </label>
          <input
            value={row.code}
            onChange={(e) => onChange({ code: e.target.value })}
            dir="ltr"
            placeholder="StMary1759503656922"
            className={`${field} ${codeBad ? bad : ok}`}
          />
        </div>

        {/* name spans both columns */}
        <div className="col-span-2">
          <label className="mb-1 block text-[10px] font-semibold text-ink-muted">الاسم رباعي *</label>
          <input
            value={row.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="الاسم رباعي"
            className={`${field} ${row.name.trim() ? ok : bad}`}
          />
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-semibold text-ink-muted">التليفون</label>
          <input
            value={row.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            dir="ltr"
            inputMode="numeric"
            placeholder="01xxxxxxxxx"
            className={`${field} ${phoneBad ? bad : ok}`}
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold text-ink-muted">تاريخ الميلاد</label>
          <input
            value={row.birth_date}
            onChange={(e) => onChange({ birth_date: e.target.value })}
            dir="ltr"
            placeholder="2022-12-04 أو 04/12/2022"
            className={`${field} ${dateBad ? bad : ok}`}
          />
        </div>

        {/* per-row date order */}
        <div>
          <label className="mb-1 block text-[10px] font-semibold text-ink-muted">
            ترتيب التاريخ
          </label>
          <div className="flex gap-1">
            {(["mdy", "dmy"] as DateOrder[]).map((o) => (
              <button
                key={o}
                onClick={() => onChange({ dateOrder: o })}
                className={`flex-1 rounded-xl py-1.5 text-[11px] font-semibold transition active:scale-95 ${
                  row.dateOrder === o ? "btn-gradient text-white" : "bg-surface-muted text-ink-muted"
                }`}
              >
                {o === "mdy" ? "شهر/يوم" : "يوم/شهر"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-semibold text-ink-muted">العنوان</label>
          <input
            value={row.address}
            onChange={(e) => onChange({ address: e.target.value })}
            className={`${field} ${ok}`}
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold text-ink-muted">الرصيد</label>
          <input
            value={row.balance}
            onChange={(e) => onChange({ balance: e.target.value.replace(/[^\d.]/g, "") })}
            dir="ltr"
            inputMode="decimal"
            placeholder="0"
            className={`${field} ${ok}`}
          />
        </div>

        <div className="col-span-2">
          <label className="mb-1 block text-[10px] font-semibold text-ink-muted">ملاحظات</label>
          <input
            value={row.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            className={`${field} ${ok}`}
          />
        </div>

        {/* per-row gender */}
        <div>
          <label className="mb-1 block text-[10px] font-semibold text-ink-muted">النوع</label>
          <div className="flex gap-1">
            {(["male", "female"] as Gender[]).map((g) => (
              <button
                key={g}
                onClick={() => onChange({ gender: g })}
                className={`flex-1 rounded-xl py-1.5 text-xs font-semibold transition active:scale-95 ${
                  row.gender === g ? "btn-gradient text-white" : "bg-surface-muted text-ink-muted"
                }`}
              >
                {g === "male" ? "ذكر" : "أنثى"}
              </button>
            ))}
          </div>
        </div>
        {/* per-row class */}
        <div>
          <label className="mb-1 block text-[10px] font-semibold text-ink-muted">الفصل *</label>
          <select
            value={row.classId}
            onChange={(e) => onChange({ classId: e.target.value })}
            className={`${field} ${classBad ? bad : ok}`}
          >
            <option value="">اختر الفصل</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {classBad && (
        <p className="mt-1 text-[10px] font-semibold text-accent">
          اختيار الفصل مطلوب لكل صف
        </p>
      )}
      {codeBad && (
        <p className="mt-1 text-[10px] font-semibold text-accent">
          الكود مكرّر — مستخدم من قبل أو متكرّر داخل القائمة. غيّره أو اتركه فارغاً
        </p>
      )}
      {phoneBad && (
        <p className="mt-1 text-[10px] font-semibold text-accent">
          التليفون لازم 11 رقم يبدأ بـ 0 (أو 10 بدون الصفر)
        </p>
      )}
      {dateBad && (
        <p className="mt-1 text-[10px] font-semibold text-accent">
          تاريخ غير صحيح للترتيب المختار ({dateOrderLabel(row.dateOrder)}) — جرّب
          تبديل ترتيب التاريخ للصف
        </p>
      )}
    </div>
  );
}
