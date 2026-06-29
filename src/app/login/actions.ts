"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

export async function signIn(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return { error: "يرجى إدخال البريد الإلكتروني وكلمة المرور." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: translateError(error.message) };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signUp(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const fullName = String(formData.get("fullName") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

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

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
