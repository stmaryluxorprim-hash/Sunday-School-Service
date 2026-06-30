/** Shared domain types for classes & members. */

export const WEEK_DAYS = [
  "السبت",
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
] as const;

export type Gender = "male" | "female";

export type ClassRow = {
  id: string;
  name: string;
  patron: string | null;
  stage: string | null;
  image_path: string | null;
  image_url: string | null;
  service_days: string[];
  color_primary: string;
  color_accent: string;
  created_at?: string;
  updated_at?: string;
};

export type MemberRow = {
  id: string;
  code: string;
  name: string; // الاسم الرباعي كامل في خانة واحدة (تخزين)
  phone: string | null; // محفوظ بصيغة +2 + 11 رقم (مثل +201273447740)
  birth_date: string | null; // تاريخ الميلاد في خانة واحدة (ISO date)
  address: string | null;
  notes: string | null;
  photo_path: string | null;
  photo_url: string | null;
  opening_balance: number;
  gender: Gender;
  class_id: string | null;
  created_at?: string;
};

/** Generate a member code: codeWord + current epoch milliseconds. */
export function generateMemberCode(codeWord: string): string {
  const clean = (codeWord || "StMary").trim().replace(/\s+/g, "");
  return `${clean}${Date.now()}`;
}

/** Effective display name for a class (falls back to stage when no name). */
export function classDisplayName(c: Pick<ClassRow, "name" | "stage">): string {
  const n = (c.name || "").trim();
  if (n) return n;
  return (c.stage || "").trim() || "بدون اسم";
}

// ---------------------------------------------------------------------------
//  Phone helpers — storage format is "+2" + 11 digits (e.g. +201273447740)
// ---------------------------------------------------------------------------

/**
 * Normalize a raw phone input into the canonical local 11-digit form.
 * - strips everything except digits
 * - drops a leading "2" / "002" country code if present
 * - if 10 digits and missing the leading 0, prepends it
 * Returns the 11-digit local number (e.g. 01273447740) or "" when unusable.
 */
export function normalizePhone(raw: string): string {
  // strip everything except digits (also removes Excel's leading apostrophe,
  // spaces, +, dashes, non-breaking spaces, Arabic-Indic digits handled below)
  let d = (raw || "")
    // convert Arabic-Indic digits ٠-٩ to ASCII 0-9
    .replace(/[\u0660-\u0669]/g, (c) => String(c.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (c) => String(c.charCodeAt(0) - 0x06f0))
    .replace(/\D/g, "");

  // strip Egyptian country code variants: 002… / 2… (when followed by 0…)
  if (d.startsWith("002")) d = d.slice(3);
  else if (d.startsWith("0020")) d = d.slice(4);
  else if (d.length >= 12 && d.startsWith("20")) d = d.slice(2); // 20 + 10 local (no 0)
  else if ((d.length === 12 || d.length === 13) && d.startsWith("2")) d = d.slice(1);

  // If 10 digits and NOT already an 11-digit local number, add the leading 0.
  // (Egyptian mobiles are 11 digits: 0 + 10. A 10-digit value is missing the 0.)
  if (d.length === 10 && !d.startsWith("0")) d = "0" + d;

  return d.slice(0, 11);
}

/** Validate the normalized local phone: 11 digits starting with 0. */
export function isValidPhone(local: string): boolean {
  return /^0\d{10}$/.test(local);
}

/** Format a normalized local phone for STORAGE: "+2" + 11 digits. */
export function phoneForStorage(local: string): string | null {
  const l = normalizePhone(local);
  return isValidPhone(l) ? `+2${l}` : null;
}

/** Display a stored phone (already "+2…") as-is, or fallback. */
export function phoneDisplay(stored: string | null): string {
  return stored || "";
}

// ---------------------------------------------------------------------------
//  Name helpers — UI uses 4 parts, storage is a single `name` string
// ---------------------------------------------------------------------------

/** Join 4 UI name parts into the single stored `name` string. */
export function joinNameParts(parts: string[]): string {
  return parts
    .map((s) => (s || "").trim())
    .filter(Boolean)
    .join(" ");
}

/** Split a stored `name` back into 4 UI parts (4th keeps any extra words). */
export function splitNameParts(name: string): [string, string, string, string] {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  return [
    parts[0] ?? "",
    parts[1] ?? "",
    parts[2] ?? "",
    parts.slice(3).join(" "),
  ];
}

// ---------------------------------------------------------------------------
//  Date helpers — UI uses day/month/year, storage is a single ISO `birth_date`
// ---------------------------------------------------------------------------

/** Combine day/month/year into a single ISO `YYYY-MM-DD` (or null). */
export function partsToISO(
  day: number | null,
  month: number | null,
  year: number | null
): string | null {
  if (!day || !month || !year) return null;
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/** Split a stored ISO `birth_date` into {day, month, year}. */
export function isoToParts(iso: string | null): {
  day: number | null;
  month: number | null;
  year: number | null;
} {
  const empty = { day: null, month: null, year: null };
  const m = (iso || "").match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return empty;
  return { year: +m[1], month: +m[2], day: +m[3] };
}

/**
 * Validate a (day, month, year) triple and build ISO — returns null if the
 * day/month are out of range, so we never send a bad date to the DB.
 */
function safeISO(
  day: number,
  month: number,
  year: number
): string | null {
  if (!day || !month || !year) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  if (year < 1900 || year > 2200) return null;
  return partsToISO(day, month, year);
}

/**
 * The order of the two non-year parts in a pasted date.
 *   - "mdy" → month before day  (e.g. 2023-12-21 = 21 Dec 2023)  ← default
 *   - "dmy" → day before month  (e.g. 2023-21-12 = 21 Dec 2023)
 */
export type DateOrder = "mdy" | "dmy";

/** Human label for a date order (Arabic). */
export function dateOrderLabel(o: DateOrder): string {
  return o === "mdy" ? "شهر/يوم" : "يوم/شهر";
}

/**
 * Parse a pasted date cell into ISO `YYYY-MM-DD` (or null), using an EXPLICIT
 * order for the two non-year parts (chosen by the user — no guessing).
 *
 * Accepts these shapes (separator = - / . or space):
 *   - year-first:  YYYY <A> <B>   → A,B interpreted per `order`
 *   - year-last:   <A> <B> YYYY   → A,B interpreted per `order`
 *
 * With order="mdy": A=month, B=day.  With order="dmy": A=day, B=month.
 * Invalid combinations (month>12, day>31, …) return null so a bad value is
 * flagged in the UI instead of being sent to the DB.
 */
export function parseDateCell(
  s: string,
  order: DateOrder = "mdy"
): string | null {
  const t = (s || "").trim();
  if (!t) return null;

  const build = (a: number, b: number, year: number): string | null =>
    order === "mdy"
      ? safeISO(b, a, year) // a=month, b=day
      : safeISO(a, b, year); // a=day,   b=month

  // year-first: YYYY <sep> A <sep> B
  const yFirst = t.match(/^(\d{4})[/\-.\s](\d{1,2})[/\-.\s](\d{1,2})$/);
  if (yFirst) return build(+yFirst[2], +yFirst[3], +yFirst[1]);

  // year-last: A <sep> B <sep> YYYY
  const yLast = t.match(/^(\d{1,2})[/\-.\s](\d{1,2})[/\-.\s](\d{4})$/);
  if (yLast) return build(+yLast[1], +yLast[2], +yLast[3]);

  return null;
}
