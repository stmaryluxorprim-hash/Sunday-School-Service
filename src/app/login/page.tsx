"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { Church, Mail, Lock, User, Loader2, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { signIn, signUp, type AuthResult } from "./actions";
import { useSettings } from "@/context/settings-context";

const initialState: AuthResult = {};

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const { branding } = useSettings();

  // Separate state per action so switching tabs clears messages naturally.
  const [signInState, signInAction] = useFormState(signIn, initialState);
  const [signUpState, signUpAction] = useFormState(signUp, initialState);

  const state = mode === "signin" ? signInState : signUpState;

  return (
    <div className="bg-aurora flex min-h-screen items-center justify-center p-5">
      <div className="relative z-10 w-full max-w-sm">
        {/* Brand */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-16 w-16 place-items-center overflow-hidden rounded-3xl btn-gradient shadow-soft">
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logoUrl} alt="logo" className="h-full w-full object-cover" />
            ) : (
              <Church className="h-8 w-8 text-white" />
            )}
          </div>
          <h1 className="text-xl font-bold text-ink">{branding.serviceName}</h1>
          <p className="text-sm text-ink-muted">{branding.slogan}</p>
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

          {/* Feedback */}
          {state.error && (
            <div className="mb-3 flex items-center gap-2 rounded-2xl bg-accent-soft px-3 py-2.5 text-sm font-semibold text-accent">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{state.error}</span>
            </div>
          )}
          {state.message && (
            <div className="mb-3 flex items-center gap-2 rounded-2xl bg-primary-soft px-3 py-2.5 text-sm font-semibold text-primary">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{state.message}</span>
            </div>
          )}

          {mode === "signin" ? (
            <form action={signInAction} className="space-y-3" key="signin">
              <Field icon={Mail} name="email" placeholder="البريد الإلكتروني" type="email" dir="ltr" autoComplete="email" />
              <Field icon={Lock} name="password" placeholder="كلمة المرور" type="password" dir="ltr" autoComplete="current-password" />
              <RememberMe />
              <SubmitButton label="دخول" />
            </form>
          ) : (
            <form action={signUpAction} className="space-y-3" key="signup">
              <Field icon={User} name="fullName" placeholder="الاسم بالكامل" type="text" autoComplete="name" />
              <Field icon={Mail} name="email" placeholder="البريد الإلكتروني" type="email" dir="ltr" autoComplete="email" />
              <Field icon={Lock} name="password" placeholder="كلمة المرور (6 أحرف على الأقل)" type="password" dir="ltr" autoComplete="new-password" />
              <RememberMe />
              <SubmitButton label="إنشاء الحساب" />
            </form>
          )}
        </div>

        {/* Back to the entry gate (member or user) */}
        <Link
          href="/welcome"
          className="mt-4 flex items-center justify-center gap-1.5 text-sm font-semibold text-ink-muted transition hover:text-ink"
        >
          <ArrowRight className="h-4 w-4" />
          لست خادماً؟ العودة لاختيار نوع الدخول
        </Link>
      </div>
    </div>
  );
}

function RememberMe() {
  return (
    <label className="flex cursor-pointer select-none items-center gap-2 px-1 text-sm font-semibold text-ink-muted">
      <input
        type="checkbox"
        name="remember"
        defaultChecked
        className="h-4 w-4 accent-[var(--color-primary,#6d5dfc)]"
      />
      تذكرني على هذا الجهاز
    </label>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-2xl btn-gradient py-3 text-sm font-bold text-white shadow-soft transition active:scale-95 disabled:opacity-70"
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending ? "جارٍ المعالجة..." : label}
    </button>
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
        required
        className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
      />
    </div>
  );
}
