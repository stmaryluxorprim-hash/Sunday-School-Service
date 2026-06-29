"use client";

import { useState } from "react";
import Link from "next/link";
import { Church, Mail, Lock, User, ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  return (
    <div className="bg-aurora flex min-h-screen items-center justify-center p-5">
      <div className="relative z-10 w-full max-w-sm">
        {/* Brand */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-3xl btn-gradient shadow-soft">
            <Church className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-ink">خدمة الكنيسة</h1>
          <p className="text-sm text-ink-muted">نخدم بمحبة ونعمل بإخلاص</p>
        </div>

        <div className="glass rounded-3xl border border-white/30 p-5 shadow-card">
          {/* Tabs */}
          <div className="mb-5 flex rounded-2xl bg-surface-muted p-1">
            <button
              onClick={() => setMode("signin")}
              className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition ${
                mode === "signin" ? "btn-gradient text-white shadow-soft" : "text-ink-muted"
              }`}
            >
              تسجيل الدخول
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition ${
                mode === "signup" ? "btn-gradient text-white shadow-soft" : "text-ink-muted"
              }`}
            >
              حساب جديد
            </button>
          </div>

          <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
            {mode === "signup" && (
              <Field icon={User} placeholder="الاسم بالكامل" type="text" />
            )}
            <Field icon={Mail} placeholder="البريد الإلكتروني" type="email" dir="ltr" />
            <Field icon={Lock} placeholder="كلمة المرور" type="password" dir="ltr" />

            {mode === "signin" && (
              <div className="text-end">
                <button type="button" className="text-xs font-semibold text-primary">
                  نسيت كلمة المرور؟
                </button>
              </div>
            )}

            <button className="w-full rounded-2xl btn-gradient py-3 text-sm font-bold text-white shadow-soft active:scale-95 transition">
              {mode === "signin" ? "دخول" : "إنشاء الحساب"}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-ink-muted">
            سيتم ربط تسجيل الدخول بـ Supabase في خطوة قادمة.
          </p>
        </div>

        <Link
          href="/"
          className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-ink-muted"
        >
          <ArrowLeft className="h-4 w-4" />
          الدخول كزائر (معاينة)
        </Link>
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  ...props
}: { icon: typeof Mail } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-primary-soft bg-surface px-3 py-3 focus-within:border-primary">
      <Icon className="h-5 w-5 text-ink-muted" />
      <input
        {...props}
        className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
      />
    </div>
  );
}
