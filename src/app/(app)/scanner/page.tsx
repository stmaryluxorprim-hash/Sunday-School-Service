"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  ScanLine,
  CalendarCheck,
  Plus,
  Minus,
  Coins,
  Camera,
  CameraOff,
  CheckCircle2,
  XCircle,
  Loader2,
  ListChecks,
  Trash2,
} from "lucide-react";
import { PageHero } from "@/components/ui/page-card";
import { useSelectedDate } from "@/context/selected-date-context";
import { useSettings } from "@/context/settings-context";
import {
  findMemberByCode,
  markAttendance,
  adjustBalance,
} from "@/lib/data/operations";

type ScanMode = "attendance" | "add_points" | "deduct_points";

type LogEntry = {
  id: string;
  code: string;
  name: string;
  ok: boolean;
  text: string;
  mode: ScanMode;
  at: string; // HH:MM:SS
};

const MODES: {
  key: ScanMode;
  label: string;
  Icon: typeof CalendarCheck;
  grad: string;
}[] = [
  { key: "attendance", label: "تسجيل حضور", Icon: CalendarCheck, grad: "grad-green" },
  { key: "add_points", label: "إضافة نقاط", Icon: Plus, grad: "grad-amber" },
  { key: "deduct_points", label: "خصم نقاط", Icon: Minus, grad: "grad-accent" },
];

export default function ScannerPage() {
  const { date } = useSelectedDate();
  const { branding, ready } = useSettings();

  const [mode, setMode] = useState<ScanMode>("attendance");
  const [points, setPoints] = useState(1);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [manualCode, setManualCode] = useState("");

  const scannerRef = useRef<unknown>(null);
  const lastScanRef = useRef<{ code: string; at: number } | null>(null);
  const busyRef = useRef(false);
  const modeRef = useRef(mode);
  const pointsRef = useRef(points);
  modeRef.current = mode;
  pointsRef.current = points;

  // عدّاد الجلسة
  const sessionStats = {
    total: log.length,
    ok: log.filter((l) => l.ok).length,
    fail: log.filter((l) => !l.ok).length,
    points: log
      .filter((l) => l.ok && (l.mode === "add_points" || l.mode === "deduct_points"))
      .reduce((s, l) => s + (l.mode === "add_points" ? pointsRef.current : 0), 0),
  };

  // اقتراح عدد النقاط الافتراضي من الإعدادات
  const seeded = useRef(false);
  useEffect(() => {
    if (!ready || seeded.current) return;
    seeded.current = true;
    setPoints(branding.defaultPoints ?? 1);
  }, [ready, branding.defaultPoints]);

  const timeNow = () =>
    new Intl.DateTimeFormat("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date());

  // معالجة كود ممسوح/مُدخل
  const handleCode = useCallback(
    async (raw: string) => {
      const code = (raw || "").trim();
      if (!code || busyRef.current) return;

      // منع تكرار نفس الكود خلال 2.5 ثانية
      const now = Date.now();
      if (
        lastScanRef.current &&
        lastScanRef.current.code === code &&
        now - lastScanRef.current.at < 2500
      )
        return;
      lastScanRef.current = { code, at: now };

      busyRef.current = true;
      setBusy(true);
      const currentMode = modeRef.current;
      const currentPoints = pointsRef.current;
      try {
        const member = await findMemberByCode(code);
        if (!member) {
          pushLog({
            code,
            name: "غير معروف",
            ok: false,
            text: "لا يوجد مخدوم بهذا الكود",
            mode: currentMode,
          });
          return;
        }
        let ok = false;
        let text = "";
        if (currentMode === "attendance") {
          const res = await markAttendance(member.id, date, currentPoints);
          ok = res.ok;
          text = res.message;
        } else {
          const amount =
            currentMode === "add_points" ? currentPoints : -currentPoints;
          const reason =
            currentMode === "add_points" ? "إضافة نقاط (ماسح)" : "خصم نقاط (ماسح)";
          const res = await adjustBalance(member.id, amount, reason, date);
          ok = res.ok;
          text = res.message;
        }
        pushLog({ code, name: member.name || "—", ok, text, mode: currentMode });
        if (ok && navigator.vibrate) navigator.vibrate(60);
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [date]
  );

  const pushLog = (e: Omit<LogEntry, "id" | "at">) => {
    setLog((prev) => [
      { ...e, id: `${Date.now()}_${Math.random()}`, at: timeNow() },
      ...prev,
    ]);
  };

  // بدء/إيقاف الكاميرا
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const el = document.getElementById("qr-reader");
      if (!el) return;
      const instance = new Html5Qrcode("qr-reader", { verbose: false });
      scannerRef.current = instance;
      await instance.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 200, height: 200 } },
        (decodedText: string) => {
          handleCode(decodedText);
        },
        () => {
          /* تجاهل أخطاء الإطارات الفارغة */
        }
      );
      setScanning(true);
    } catch (err) {
      setCameraError(
        "تعذّر تشغيل الكاميرا. تأكد من منح إذن الكاميرا واستخدام HTTPS."
      );
      setScanning(false);
    }
  }, [handleCode]);

  const stopCamera = useCallback(async () => {
    const inst = scannerRef.current as
      | { stop: () => Promise<void>; clear: () => void }
      | null;
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

  // تنظيف عند مغادرة الصفحة
  useEffect(() => {
    return () => {
      const inst = scannerRef.current as { stop: () => Promise<void> } | null;
      if (inst) inst.stop().catch(() => {});
    };
  }, []);

  const modeMeta = MODES.find((m) => m.key === mode)!;

  return (
    <div>
      <PageHero
        title="الماسح"
        subtitle="مسح الكود لتسجيل الحضور والنقاط"
        icon={ScanLine}
        grad="grad-violet"
      />

      {/* على الكمبيوتر: الإعدادات + الكاميرا في عمود، والعدّاد + السجل في عمود آخر */}
      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-3">
      <div>
      {/* اختيار الوظيفة */}
      <div className="animate-fade-up card-topline mb-3 rounded-xl bg-surface p-3 pt-4 shadow-card border border-white/40">
        <p className="mb-2 text-xs font-bold text-ink-muted">وظيفة المسح</p>
        <div className="grid grid-cols-3 gap-2">
          {MODES.map((m) => {
            const active = mode === m.key;
            const Icon = m.Icon;
            return (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                className={`flex flex-col items-center gap-1 rounded-lg px-2 py-3 text-xs font-bold transition active:scale-95 ${
                  active ? `${m.grad} shadow-soft` : "bg-surface-muted text-ink-muted"
                }`}
              >
                <Icon className="h-5 w-5" />
                {m.label}
              </button>
            );
          })}
        </div>

        {/* عدّاد النقاط */}
        <div className="mt-3 flex items-center gap-3">
          <div className="flex w-24 shrink-0 items-center gap-1.5 text-sm font-bold text-ink">
            <Coins className="h-4 w-4 text-amber-500" />
            <span>{mode === "attendance" ? "نقاط الحضور" : "عدد النقاط"}</span>
          </div>
          <div className="flex flex-1 items-center gap-2">
            <button
              onClick={() => setPoints((p) => Math.max(0, p - 1))}
              className="grid h-10 w-10 place-items-center rounded-2xl bg-surface-muted text-primary active:scale-95"
            >
              <Minus className="h-5 w-5" />
            </button>
            <input
              value={String(points)}
              onChange={(e) => {
                const clean = e.target.value.replace(/[^\d.]/g, "");
                setPoints(clean === "" ? 0 : Number(clean));
              }}
              inputMode="decimal"
              dir="ltr"
              className="h-10 flex-1 rounded-2xl border border-primary-soft bg-surface-muted text-center text-sm font-bold text-primary outline-none focus:border-primary"
            />
            <button
              onClick={() => setPoints((p) => p + 1)}
              className="grid h-10 w-10 place-items-center rounded-2xl bg-surface-muted text-primary active:scale-95"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* الكاميرا */}
      <div className="animate-fade-up mb-3 rounded-xl bg-surface p-3 shadow-card border border-white/40">
        <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-xl bg-ink/90">
          <div id="qr-reader" className="h-full w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />
          {!scanning && (
            <div className="absolute inset-0 grid place-items-center">
              <div className="relative h-48 w-48">
                <span className="absolute right-0 top-0 h-8 w-8 rounded-tr-2xl border-r-4 border-t-4 border-primary" />
                <span className="absolute left-0 top-0 h-8 w-8 rounded-tl-2xl border-l-4 border-t-4 border-primary" />
                <span className="absolute bottom-0 right-0 h-8 w-8 rounded-br-2xl border-b-4 border-r-4 border-accent" />
                <span className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-2xl border-b-4 border-l-4 border-accent" />
              </div>
              <p className="absolute bottom-4 text-xs text-white/70">
                اضغط لبدء المسح
              </p>
            </div>
          )}
          {busy && (
            <div className="absolute inset-x-0 top-0 grid place-items-center bg-primary/80 py-1 text-xs font-bold text-white">
              <span className="flex items-center gap-1">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> جارٍ التنفيذ...
              </span>
            </div>
          )}
        </div>

        <button
          onClick={scanning ? stopCamera : startCamera}
          className={`mt-3 flex w-full items-center justify-center gap-2 rounded-lg py-3.5 text-sm font-bold text-white shadow-soft active:scale-95 ${
            scanning ? "bg-rose-500" : "grad-violet"
          }`}
        >
          {scanning ? (
            <>
              <CameraOff className="h-5 w-5" /> إيقاف الكاميرا
            </>
          ) : (
            <>
              <Camera className="h-5 w-5" /> بدء المسح ({modeMeta.label})
            </>
          )}
        </button>

        {cameraError && (
          <p className="mt-2 text-center text-xs text-rose-500">{cameraError}</p>
        )}

        {/* إدخال يدوي للكود (بديل عند عدم توفّر الكاميرا) */}
        <div className="mt-3 flex items-center gap-2">
          <input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && manualCode.trim()) {
                handleCode(manualCode.trim());
                setManualCode("");
              }
            }}
            placeholder="أو أدخل الكود يدوياً..."
            className="flex-1 rounded-2xl border border-primary-soft bg-surface-muted px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
          />
          <button
            onClick={() => {
              if (manualCode.trim()) {
                handleCode(manualCode.trim());
                setManualCode("");
              }
            }}
            disabled={!manualCode.trim() || busy}
            className="rounded-lg grad-violet px-4 py-2.5 text-sm font-bold text-white shadow-soft active:scale-95 disabled:opacity-50"
          >
            تنفيذ
          </button>
        </div>
      </div>
      </div>

      <div>
      {/* عدّاد الجلسة */}
      <div className="animate-fade-up mb-3 grid grid-cols-3 gap-2">
        <div className="rounded-lg border-t-2 border-primary bg-surface p-3 text-center shadow-card">
          <p className="text-xl font-bold text-gradient">{sessionStats.total}</p>
          <p className="text-[10px] text-ink-muted">إجمالي المسح</p>
        </div>
        <div className="rounded-lg border-t-2 border-emerald-500 bg-surface p-3 text-center shadow-card">
          <p className="text-xl font-bold text-emerald-600">{sessionStats.ok}</p>
          <p className="text-[10px] text-ink-muted">ناجح</p>
        </div>
        <div className="rounded-lg border-t-2 border-rose-500 bg-surface p-3 text-center shadow-card">
          <p className="text-xl font-bold text-rose-500">{sessionStats.fail}</p>
          <p className="text-[10px] text-ink-muted">فاشل</p>
        </div>
      </div>

      {/* سجل الجلسة */}
      <div className="animate-fade-up rounded-xl bg-surface p-3 shadow-card border border-white/40">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm font-bold text-ink">
            <ListChecks className="h-4 w-4 text-primary" />
            سجل جلسة المسح
          </div>
          {log.length > 0 && (
            <button
              onClick={() => setLog([])}
              className="flex items-center gap-1 rounded-xl bg-surface-muted px-2.5 py-1.5 text-xs font-bold text-rose-500 active:scale-95"
            >
              <Trash2 className="h-3.5 w-3.5" /> مسح
            </button>
          )}
        </div>

        {log.length === 0 ? (
          <p className="py-6 text-center text-xs text-ink-muted">
            لا عمليات مسح بعد في هذه الجلسة
          </p>
        ) : (
          <div className="space-y-2">
            {log.map((l) => (
              <div
                key={l.id}
                className="flex items-center gap-2.5 rounded-lg bg-surface-muted p-2.5"
              >
                {l.ok ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                ) : (
                  <XCircle className="h-5 w-5 shrink-0 text-rose-500" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">{l.name}</p>
                  <p className="truncate text-[11px] text-ink-muted">{l.text}</p>
                </div>
                <span className="shrink-0 text-[10px] text-ink-muted" dir="ltr">
                  {l.at}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
      </div>
    </div>
  );
}
