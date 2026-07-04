"use client";

import Link from "next/link";
import { Church, Users, CreditCard, ChevronLeft } from "lucide-react";
import { useSettings } from "@/context/settings-context";

/**
 * بوابة الدخول — أول شاشة يراها الزائر غير المسجَّل:
 * يختار «مخدوم» (دخول بمسح الكارت) أو «خادم» (بريد وكلمة مرور)
 * ويُوجَّه لصفحة تسجيل الدخول المناسبة.
 */
export default function WelcomePage() {
  const { branding } = useSettings();

  return (
    <div className="bg-aurora flex min-h-screen items-center justify-center p-5">
      <div className="relative z-10 w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 grid h-20 w-20 place-items-center overflow-hidden rounded-3xl btn-gradient shadow-soft">
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logoUrl} alt="logo" className="h-full w-full object-cover" />
            ) : (
              <Church className="h-10 w-10 text-white" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-ink">{branding.serviceName}</h1>
          <p className="text-sm text-ink-muted">{branding.slogan}</p>
        </div>

        <div className="glass rounded-3xl border border-white/30 p-5 shadow-card">
          <p className="mb-4 text-center text-base font-bold text-ink">
            أهلاً بك! كيف تريد الدخول؟
          </p>

          <div className="space-y-3">
            {/* Member (scan card) */}
            <Link
              href="/member/login"
              className="flex items-center gap-4 rounded-3xl btn-gradient p-4 text-white shadow-soft transition active:scale-95"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/20">
                <CreditCard className="h-6 w-6" />
              </span>
              <span className="flex-1 text-right">
                <span className="block text-base font-bold">أنا مخدوم</span>
                <span className="block text-xs opacity-90">
                  الدخول بمسح كارت العضوية (QR)
                </span>
              </span>
              <ChevronLeft className="h-5 w-5 opacity-80" />
            </Link>

            {/* User (staff) */}
            <Link
              href="/login"
              className="flex items-center gap-4 rounded-3xl border border-primary-soft bg-surface p-4 text-ink shadow-soft transition active:scale-95"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl grad-teal text-white">
                <Users className="h-6 w-6" />
              </span>
              <span className="flex-1 text-right">
                <span className="block text-base font-bold">أنا خادم</span>
                <span className="block text-xs text-ink-muted">
                  الدخول بالبريد الإلكتروني وكلمة المرور
                </span>
              </span>
              <ChevronLeft className="h-5 w-5 text-ink-muted" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
