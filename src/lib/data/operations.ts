import { createClient } from "@/lib/supabase/client";
import { MemberRow, ActionKey } from "@/lib/data/types";

export type OpResult =
  | { ok: true; member: MemberRow; message: string }
  | { ok: false; message: string };

/** صياغة رسالة خطأ الحد اليومي: daily_limit_exceeded:<max>:<used> */
function parseDailyLimit(msg: string): { max: number; used: number } | null {
  const m = msg.match(/daily_limit_exceeded:([\d.]+):([\d.]+)/);
  if (!m) return null;
  return { max: Number(m[1]), used: Number(m[2]) };
}

/**
 * تسجيل حضور للمخدوم في التاريخ المحدد (يمنع التكرار)
 * ويضيف `points` نقطة للرصيد (مرّة واحدة فقط لذلك اليوم).
 */
export async function markAttendance(
  memberId: string,
  date: string,
  points = 0
): Promise<OpResult> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("mark_attendance", {
    p_member_id: memberId,
    p_date: date,
    p_points: points,
  });
  if (error) return { ok: false, message: "تعذّر تسجيل الحضور" };
  return {
    ok: true,
    member: data as MemberRow,
    message: points ? `تم تسجيل الحضور (+${points})` : "تم تسجيل الحضور",
  };
}

/**
 * إلغاء حضور التاريخ المحدد وخصم `points` من الرصيد
 * (مرّة واحدة فقط إن كان هناك حضور مسجّل لذلك اليوم).
 */
export async function unmarkAttendance(
  memberId: string,
  date: string,
  points = 0
): Promise<OpResult> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("unmark_attendance", {
    p_member_id: memberId,
    p_date: date,
    p_points: points,
  });
  if (error) return { ok: false, message: "تعذّر إلغاء الحضور" };
  return {
    ok: true,
    member: data as MemberRow,
    message: points ? `تم إلغاء حضور اليوم (-${points})` : "تم إلغاء حضور اليوم",
  };
}

/** تعديل الرصيد (موجب = إضافة، سالب = خصم) مع سبب وتاريخ لحدّ اليوم. */
export async function adjustBalance(
  memberId: string,
  amount: number,
  reason: string,
  date: string
): Promise<OpResult> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("adjust_balance", {
    p_member_id: memberId,
    p_amount: amount,
    p_reason: reason,
    p_date: date,
  });
  if (error) {
    const limit = parseDailyLimit(error.message || "");
    if (limit) {
      const remaining = Math.max(limit.max - limit.used, 0);
      return {
        ok: false,
        message: `تجاوزت الحد اليومي للنقاط (${limit.max}). المتبقّي اليوم: ${remaining}`,
      };
    }
    if ((error.message || "").includes("amount_zero")) {
      return { ok: false, message: "أدخل قيمة نقاط صحيحة" };
    }
    return { ok: false, message: "تعذّر تعديل النقاط" };
  }
  return {
    ok: true,
    member: data as MemberRow,
    message: amount >= 0 ? "تمت إضافة النقاط" : "تم خصم النقاط",
  };
}

/** هل الوظيفة من نوع النقاط (تحتاج إدخال قيمة وسبب)؟ */
export function isPointsAction(a: ActionKey): boolean {
  return a === "add_points" || a === "deduct_points";
}

/** تعديل بيانات مخدوم — يُحدَّث فقط ما يُمرَّر في patch. */
export async function updateMember(
  memberId: string,
  patch: Partial<MemberRow>
): Promise<OpResult> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("members")
    .update(patch)
    .eq("id", memberId)
    .select("*")
    .single();
  if (error || !data) {
    if ((error?.message || "").includes("duplicate"))
      return { ok: false, message: "هذا الكود مستخدم من قبل" };
    return { ok: false, message: "تعذّر حفظ التعديلات" };
  }
  return { ok: true, member: data as MemberRow, message: "تم حفظ التعديلات" };
}

/** إلغاء (حذف) مخدوم نهائياً. */
export async function deleteMember(
  memberId: string
): Promise<{ ok: boolean; message: string }> {
  const supabase = createClient();
  const { error } = await supabase.from("members").delete().eq("id", memberId);
  if (error) return { ok: false, message: "تعذّر إلغاء المخدوم" };
  return { ok: true, message: "تم إلغاء المخدوم" };
}

/** البحث عن مخدوم بالكود (المستخدم في الماسح). */
export async function findMemberByCode(
  code: string
): Promise<MemberRow | null> {
  const clean = (code || "").trim();
  if (!clean) return null;
  const supabase = createClient();
  const { data } = await supabase
    .from("members")
    .select("*")
    .eq("code", clean)
    .maybeSingle();
  return (data as MemberRow) ?? null;
}
