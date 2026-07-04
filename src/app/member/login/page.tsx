"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import {
  Church,
  CreditCard,
  ScanLine,
  Keyboard,
  Loader2,
  AlertCircle,
  ArrowRight,
  Camera,
  CameraOff,
} from "lucide-react";
import { memberSignIn, type MemberAuthResult } from "./actions";
import { useSettings } from "@/context/settings-context";

const initialState: MemberAuthResult = {};

/**
 * تسجيل دخول المخدوم — مسح كارت العضوية (QR) بالكاميرا،
 * أو إدخال الكود يدوياً، مع خيار «تذكرني على هذا الجهاز».
 */
export default function MemberLoginPage() {
  const { branding } = useSettings();
  const [state, formAction] = useFormState(memberSignIn, initialState);

  const [tab, setTab] = useState<"scan" | "manual">("scan");
  const [code, setCode] = useState("");
  const [remember, setRemember] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const submittedRef = useRef(false);

  // عند التقاط كود من الكاميرا: عبّئ الحقل وأرسل النموذج تلقائياً
  const handleScanned = useCallback((decoded: string) => {
    const c = (decoded || "").trim();
    if (!c || submittedRef.current) return;
    submittedRef.current = true;
    setCode(c);
    // Submit on the next tick so the input value is committed first.
    setTimeout(() => formRef.current?.requestSubmit(), 30);
  }, []);

  const stopCamera = useCallback(async () => {
    const inst = scannerRef.current;
    if (inst) {
      try {
        await inst.stop();
        inst.clear();
      } catch {
        /* ignore */
      }
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    submittedRef.current = false;
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const el = document.getElementById("member-qr-reader");
      if (!el) return;
      const instance = new Html5Qrcode("member-qr-reader", { verbose: false });
      scannerRef.current = instance as unknown as {
        stop: () => Promise<void>;
        clear: () => void;
      };
      await instance.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText: string) => handleScanned(decodedText),
        () => {
          /* تجاهل الإطارات الفارغة */
        }
      );
      setScanning(true);
    } catch {
      setCameraError("تعذّر تشغيل الكاميرا. تأكد من منح إذن الكاميرا واستخدام HTTPS.");
      setScanning(false);
    }
  }, [handleScanned]);

  // إيقاف الكاميرا عند مغادرة الصفحة أو تبديل التبويب
  useEffect(() => {
    if (tab !== "scan") stopCamera();
    return () => {
      stopCamera();
    };
  }, [tab, stopCamera]);

  // عند فشل الدخول (كارت غير معروف) اسمح بمحاولة مسح جديدة
  useEffect(() => {
    if (state.error) submittedRef.current = false;
  }, [state.error]);

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
          <p className="flex items-center justify-center gap-1.5 text-sm text-ink-muted">
            <CreditCard className="h-4 w-4" />
            دخول المخدومين — امسح كارت عضويتك
          </p>
        </div>

        <div className="glass rounded-3xl border border-white/30 p-5 shadow-card">
          {/* Tabs: scan / manual */}
          <div className="mb-4 flex rounded-2xl bg-surface-muted p-1">
            <button
              onClick={() => setTab("scan")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold transition ${
                tab === "scan" ? "btn-gradient text-white shadow-soft" : "text-ink-muted"
              }`}
            >
              <ScanLine className="h-4 w-4" />
              مسح الكارت
            </button>
            <button
              onClick={() => setTab("manual")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold transition ${
                tab === "manual" ? "btn-gradient text-white shadow-soft" : "text-ink-muted"
              }`}
            >
              <Keyboard className="h-4 w-4" />
              إدخال الكود
            </button>
          </div>

          {/* Feedback */}
          {state.error && (
            <div className="mb-3 flex items-center gap-2 rounded-2xl bg-accent-soft px-3 py-2.5 text-sm font-semibold text-accent">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{state.error}</span>
            </div>
          )}
          {cameraError && tab === "scan" && (
            <div className="mb-3 flex items-center gap-2 rounded-2xl bg-accent-soft px-3 py-2.5 text-sm font-semibold text-accent">
              <CameraOff className="h-4 w-4 shrink-0" />
              <span>{cameraError}</span>
            </div>
          )}

          <form ref={formRef} action={formAction} className="space-y-3">
            {tab === "scan" ? (
              <>
                {/* Camera viewport */}
                <div className="overflow-hidden rounded-2xl border border-primary-soft bg-black/80">
                  <div id="member-qr-reader" className="min-h-[240px] w-full" />
                </div>
                {!scanning ? (
                  <button
                    type="button"
                    onClick={startCamera}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl btn-gradient py-3 text-sm font-bold text-white shadow-soft transition active:scale-95"
                  >
                    <Camera className="h-4 w-4" />
                    تشغيل الكاميرا
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-primary-soft bg-surface py-3 text-sm font-bold text-ink transition active:scale-95"
                  >
                    <CameraOff className="h-4 w-4" />
                    إيقاف الكاميرا
                  </button>
                )}
                {/* Hidden code field filled by the scanner */}
                <input type="hidden" name="code" value={code} />
              </>
            ) : (
              <div className="flex items-center gap-2 rounded-2xl border border-primary-soft bg-surface px-3 py-3 focus-within:border-primary">
                <CreditCard className="h-5 w-5 text-ink-muted" />
                <input
                  name="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="كود العضوية المطبوع على الكارت"
                  dir="ltr"
                  autoComplete="off"
                  className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
                />
              </div>
            )}

            {/* Remember me */}
            <label className="flex cursor-pointer select-none items-center gap-2 px-1 text-sm font-semibold text-ink-muted">
              <input
                type="checkbox"
                name="remember"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 accent-[var(--color-primary,#6d5dfc)]"
              />
              تذكرني على هذا الجهاز
            </label>

            {tab === "manual" && <SubmitButton />}
            {tab === "scan" && <ScanPendingIndicator />}
          </form>
        </div>

        {/* Back to the gate */}
        <Link
          href="/welcome"
          className="mt-4 flex items-center justify-center gap-1.5 text-sm font-semibold text-ink-muted transition hover:text-ink"
        >
          <ArrowRight className="h-4 w-4" />
          لست مخدوماً؟ العودة لاختيار نوع الدخول
        </Link>
      </div>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-2xl btn-gradient py-3 text-sm font-bold text-white shadow-soft transition active:scale-95 disabled:opacity-70"
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending ? "جارٍ التحقق..." : "دخول"}
    </button>
  );
}

/** يظهر أثناء التحقق التلقائي بعد التقاط الكود بالكاميرا. */
function ScanPendingIndicator() {
  const { pending } = useFormStatus();
  if (!pending) return null;
  return (
    <div className="flex items-center justify-center gap-2 rounded-2xl bg-primary-soft py-3 text-sm font-bold text-primary">
      <Loader2 className="h-4 w-4 animate-spin" />
      تم التقاط الكارت — جارٍ التحقق...
    </div>
  );
}
