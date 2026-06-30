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
  let d = (raw || "").replace(/\D/g, "");
  // strip country code variants: 002xxxxxxxxxxx / 2xxxxxxxxxxx
  if (d.startsWith("002")) d = d.slice(3);
  else if (d.length === 13 && d.startsWith("2")) d = d.slice(1);
  else if (d.length === 12 && d.startsWith("2")) d = d.slice(1);
  // 10 digits missing the leading 0 -> add it
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
 * Parse a pasted date cell into ISO `YYYY-MM-DD` (or null).
 * Accepts `YYYY-MM-DD` and `D/M/YYYY` / `D-M-YYYY` / `D.M.YYYY`.
 */
export function parseDateCell(s: string): string | null {
  const t = (s || "").trim();
  if (!t) return null;
  const iso = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return partsToISO(+iso[3], +iso[2], +iso[1]);
  const dmy = t.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmy) return partsToISO(+dmy[1], +dmy[2], +dmy[3]);
  return null;
}
