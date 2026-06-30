"use client";

import { isValidPhone, normalizePhone } from "@/lib/data/types";

/**
 * Phone field: fixed +2 prefix. Accepts 10 digits (missing leading 0) or
 * 11 digits starting with 0 — normalized to 11 digits on save. Stored as
 * "+2" + 11 digits. Only digits allowed, capped at 12 to allow a typed "2".
 */
export function PhoneField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  // valid if it normalizes to a proper 11-digit local number
  const invalid = value.length > 0 && !isValidPhone(normalizePhone(value));

  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-ink-muted">رقم التليفون</label>
      <div
        className={`flex items-center gap-2 rounded-2xl border bg-surface-muted px-3 py-2.5 ${
          invalid ? "border-accent" : "border-primary-soft focus-within:border-primary"
        }`}
        dir="ltr"
      >
        <span className="shrink-0 rounded-lg bg-primary-soft px-2 py-1 text-sm font-bold text-primary">
          +2
        </span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 12))}
          inputMode="numeric"
          placeholder="01xxxxxxxxx"
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
        />
      </div>
      {invalid ? (
        <p className="mt-1 text-[11px] font-semibold text-accent">
          يجب أن يكون 11 رقماً يبدأ بـ 0 (أو 10 أرقام بدون الصفر)
        </p>
      ) : (
        <p className="mt-1 text-[11px] text-ink-muted">
          يُحفظ بصيغة <span dir="ltr">+2…</span> — لو 10 أرقام يُضاف الصفر تلقائياً
        </p>
      )}
    </div>
  );
}
