"use client";

const MONTHS_AR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

const NOW = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => NOW - i);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export type DOB = { day: number | null; month: number | null; year: number | null };

export function DobSelect({
  value,
  onChange,
}: {
  value: DOB;
  onChange: (v: DOB) => void;
}) {
  const sel =
    "rounded-2xl border border-primary-soft bg-surface-muted px-2 py-2.5 text-sm text-ink outline-none focus:border-primary";
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-ink-muted">تاريخ الميلاد</label>
      <div className="grid grid-cols-3 gap-2">
        <select
          className={sel}
          value={value.day ?? ""}
          onChange={(e) => onChange({ ...value, day: e.target.value ? +e.target.value : null })}
        >
          <option value="">اليوم</option>
          {DAYS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select
          className={sel}
          value={value.month ?? ""}
          onChange={(e) => onChange({ ...value, month: e.target.value ? +e.target.value : null })}
        >
          <option value="">الشهر</option>
          {MONTHS_AR.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>
        <select
          className={sel}
          value={value.year ?? ""}
          onChange={(e) => onChange({ ...value, year: e.target.value ? +e.target.value : null })}
        >
          <option value="">السنة</option>
          {YEARS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
