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
