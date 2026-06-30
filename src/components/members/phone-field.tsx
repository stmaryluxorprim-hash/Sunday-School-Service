"use client";

import { isValidPhone } from "@/lib/data/types";

/**
 * Phone field: fixed +2 prefix + 11-digit number that must start with 0.
 * Only digits allowed, capped at 11.
 */
export function PhoneField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const invalid = value.length > 0 && !isValidPhone(value);

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
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 11))}
          inputMode="numeric"
          placeholder="01xxxxxxxxx"
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
        />
      </div>
      {invalid && (
        <p className="mt-1 text-[11px] font-semibold text-accent">
          يجب أن يكون 11 رقماً ويبدأ بـ 0 (مثال: 01012345678)
        </p>
      )}
    </div>
  );
}
