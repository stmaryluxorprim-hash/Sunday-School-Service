"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { memberLogin } from "@/lib/member/portal";
import {
  MEMBER_COOKIE,
  MEMBER_REMEMBER_MAX_AGE,
  createMemberToken,
} from "@/lib/member/session";

export type MemberAuthResult = {
  error?: string;
};

/**
 * تسجيل دخول المخدوم بكود الكارت (من مسح QR أو إدخال يدوي).
 * ينشئ كوكي جلسة موقَّعة httpOnly — دائمة عند اختيار «تذكرني».
 */
export async function memberSignIn(
  _prev: MemberAuthResult,
  formData: FormData
): Promise<MemberAuthResult> {
  const code = String(formData.get("code") || "").trim();
  const remember = formData.get("remember") === "on";

  if (!code) {
    return { error: "امسح الكارت أو أدخل كود العضوية." };
  }

  let member: Awaited<ReturnType<typeof memberLogin>> = null;
  try {
    member = await memberLogin(code);
  } catch {
    return { error: "تعذّر الاتصال بالخادم. حاول مرة أخرى." };
  }

  if (!member) {
    return { error: "الكارت غير معروف. تأكد من الكود وحاول مرة أخرى." };
  }

  const token = await createMemberToken(member.code, member.name, remember);
  cookies().set(MEMBER_COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    ...(remember ? { maxAge: MEMBER_REMEMBER_MAX_AGE } : {}),
  });

  revalidatePath("/member", "layout");
  redirect("/member");
}

/** تسجيل خروج المخدوم. */
export async function memberSignOut(): Promise<void> {
  cookies().delete(MEMBER_COOKIE);
  revalidatePath("/member", "layout");
  redirect("/welcome");
}
