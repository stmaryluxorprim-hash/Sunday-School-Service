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
  name1: string;
  name2: string;
  name3: string;
  name4: string;
  full_name?: string;
  phone: string | null;
  birth_day: number | null;
  birth_month: number | null;
  birth_year: number | null;
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

/** Validate an Egyptian-style 11-digit phone starting with 0. */
export function isValidPhone(phone: string): boolean {
  return /^0\d{10}$/.test(phone);
}

/**
 * Split a full (typically 4-part) name typed in a single field into the
 * stored parts [name1, name2, name3, name4]. This is purely an INPUT helper —
 * storage stays split. Extra words beyond the 4th are appended to name4 so we
 * never lose any part of the name.
 */
export function splitName(full: string): [string, string, string, string] {
  const parts = (full || "").trim().split(/\s+/).filter(Boolean);
  const name1 = parts[0] ?? "";
  const name2 = parts[1] ?? "";
  const name3 = parts[2] ?? "";
  const name4 = parts.slice(3).join(" "); // keep the rest together
  return [name1, name2, name3, name4];
}

/** Join the stored name parts back into a single full-name string. */
export function joinName(
  c: Pick<MemberRow, "name1" | "name2" | "name3" | "name4">
): string {
  return [c.name1, c.name2, c.name3, c.name4]
    .map((s) => (s || "").trim())
    .filter(Boolean)
    .join(" ");
}

/**
 * Parse a single date string into the stored {day, month, year} parts.
 * Accepts ISO `YYYY-MM-DD` (from <input type="date">) and common
 * `D/M/YYYY` / `D-M-YYYY` formats used when pasting. INPUT helper only —
 * storage stays split into birth_day / birth_month / birth_year.
 */
export function parseDateString(s: string): {
  day: number | null;
  month: number | null;
  year: number | null;
} {
  const empty = { day: null, month: null, year: null };
  const t = (s || "").trim();
  if (!t) return empty;

  // ISO: YYYY-MM-DD
  const iso = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    return { year: +iso[1], month: +iso[2], day: +iso[3] };
  }
  // D/M/YYYY or D-M-YYYY
  const dmy = t.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmy) {
    return { day: +dmy[1], month: +dmy[2], year: +dmy[3] };
  }
  return empty;
}

/** Format the stored DOB parts back to ISO `YYYY-MM-DD` (for <input type="date">). */
export function dobToISO(
  c: Pick<MemberRow, "birth_day" | "birth_month" | "birth_year">
): string {
  if (!c.birth_year || !c.birth_month || !c.birth_day) return "";
  const mm = String(c.birth_month).padStart(2, "0");
  const dd = String(c.birth_day).padStart(2, "0");
  return `${c.birth_year}-${mm}-${dd}`;
}
