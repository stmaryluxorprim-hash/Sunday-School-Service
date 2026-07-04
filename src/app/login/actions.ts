"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { REMEMBER_COOKIE, REMEMBER_MAX_AGE } from "@/lib/auth/remember";

export type AuthResult = {
  error?: string;
  message?: string;
};

/** Translate common Supabase auth errors to Arabic. */
function translateError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials"))
    return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
  if (m.includes("email not confirmed"))
    return "لم يتم تأكيد البريد الإلكتروني بعد. تحقق من بريدك.";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "هذا البريد الإلكتروني مسجّل بالفعل.";
  if (m.includes("password should be at least"))
    return "كلمة المرور قصيرة جداً (6 أحرف على الأقل).";
  if (m.includes("unable to validate email") || m.includes("invalid email"))
    return "صيغة البريد الإلكتروني غير صحيحة.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "محاولات كثيرة. حاول مرة أخرى بعد قليل.";
  return "حدث خطأ. حاول مرة أخرى.";
}

/** Persist the "تذكرني" choice so the middleware can shape auth cookies. */
function setRememberChoice(remember: boolean) {
  cookies().set(REMEMBER_COOKIE, remember ? "1" : "0", {
    path: "/",
    sameSite: "lax",
    // The preference cookie itself: persistent when remembering,
    // session-only otherwise (so both cookies expire together).
    ...(remember ? { maxAge: REMEMBER_MAX_AGE } : {}),
  });
}

export async function signIn(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const remember = formData.get("remember") === "on";

  if (!email || !password) {
    return { error: "يرجى إدخال البريد الإلكتروني وكلمة المرور." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: translateError(error.message) };
  }

  setRememberChoice(remember);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function signUp(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const fullName = String(formData.get("fullName") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const remember = formData.get("remember") === "on";

  if (!fullName || !email || !password) {
    return { error: "يرجى ملء جميع الحقول." };
  }
  if (password.length < 6) {
    return { error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل." };
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });

  if (error) {
    return { error: translateError(error.message) };
  }

  // If email confirmation is required, no session is returned yet.
  if (data.user && !data.session) {
    return {
      message: "تم إنشاء الحساب! تحقق من بريدك الإلكتروني لتأكيد الحساب ثم سجّل الدخول.",
    };
  }

  setRememberChoice(remember);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  cookies().delete(REMEMBER_COOKIE);
  revalidatePath("/", "layout");
  redirect("/welcome");
}
