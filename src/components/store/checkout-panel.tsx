"use client";

/**
 * نقطة البيع (POS) — سيناريو الشراء:
 *   1. الخادم يفتح الماسح ويمسح **كارت الطفل أولاً** → يظهر الاسم ورصيد النقاط.
 *   2. يبدأ مسح الهدايا → تُضاف للفاتورة الحيّة مع الإجمالي والمتبقي من الرصيد.
 *   3. لو الهدية تتجاوز الرصيد المتبقي → تُرفض الإضافة.
 *   4. يمكن زيادة/إنقاص كمية كل هدية + زر مسح لتفريغ الفاتورة.
 *   5. زر «إتمام عملية الشراء» → تأكيد → خصم ذرّي + فاتورة تصل لبوابة الطفل.
 *
 * الماسح واحد ذكي: كود يبدأ بـ ITEM- → هدية، غير ذلك → كارت طفل.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  CameraOff,
  Loader2,
  Minus,
  Plus,
  Trash2,
  ShoppingCart,
  UserRound,
  CheckCircle2,
  Coins,
  ReceiptText,
  ScanLine,
  Wallet,
  BadgeCheck,
  LogOut,
  X,
} from "lucide-react";
import { StoreItemRow, CartLine, isItemCode } from "@/lib/store/types";
import { findItemByCode, storeCheckout } from "@/lib/store/operations";
import { findMemberByCode } from "@/lib/data/operations";
import type { MemberRow } from "@/lib/data/types";

type SuccessInfo = {
  invoiceNo: number;
  totalPoints: number;
  newBalance: number;
  memberName: string;
  lines: { name: string; qty: number; lineTotal: number }[];
};

export function CheckoutPanel({
  items,
  onCheckoutDone,
}: {
  items: StoreItemRow[];
  onCheckoutDone: () => void;
}) {
  const [member, setMember] = useState<MemberRow | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [success, setSuccess] = useState<SuccessInfo | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const scannerRef = useRef<unknown>(null);
  const lastScanRef = useRef<{ code: string; at: number } | null>(null);
  const busyRef = useRef(false);
  const cartRef = useRef(cart);
  cartRef.current = cart;
  const memberRef = useRef(member);
  memberRef.current = member;
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const balance = member ? Number(member.opening_balance) : 0;
  const total = cart.reduce((s, l) => s + Number(l.item.points_price) * l.qty, 0);
  const remaining = balance - total;

  const showFlash = (ok: boolean, text: string) => {
    setFlash({ ok, text });
    setTimeout(() => setFlash(null), 2600);
    if (navigator.vibrate) navigator.vibrate(ok ? 60 : [90, 60, 90]);
  };

  // ------------------------------------------------------------------
  // إضافة هدية للفاتورة (مع التحقق من المخزون + الرصيد المتبقي)
  // ------------------------------------------------------------------
  const addToCart = useCallback((item: StoreItemRow) => {
    const m = memberRef.current;
    if (!m) {
      showFlash(false, "امسح كارت الطفل أولاً قبل إضافة الهدايا");
      return;
    }
    if (!item.is_active) {
      showFlash(false, `«${item.name}» موقوف حالياً`);
      return;
    }
    const price = Number(item.points_price);
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.item.id === item.id);
      const currentQty = idx >= 0 ? prev[idx].qty : 0;
      if (currentQty + 1 > item.stock) {
        showFlash(false, `الكمية غير كافية من «${item.name}» — المتاح: ${item.stock}`);
        return prev;
      }
      const currentTotal = prev.reduce(
        (s, l) => s + Number(l.item.points_price) * l.qty,
        0
      );
      const bal = Number(m.opening_balance);
      if (currentTotal + price > bal) {
        showFlash(
          false,
          `الرصيد لا يكفي لإضافة «${item.name}» — المتبقي: ${bal - currentTotal} نقطة`
        );
        return prev;
      }
      showFlash(true, `أُضيف «${item.name}» — المتبقي: ${bal - currentTotal - price} نقطة`);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...prev, { item, qty: 1 }];
    });
  }, []);

  // تغيير الكمية (+/-) مع التحقق من المخزون والرصيد
  const changeQty = (itemId: string, delta: number) => {
    const m = memberRef.current;
    setCart((prev) => {
      const line = prev.find((l) => l.item.id === itemId);
      if (!line) return prev;
      if (delta > 0) {
        if (line.qty + delta > line.item.stock) {
          showFlash(false, `الكمية غير كافية — المتاح: ${line.item.stock}`);
          return prev;
        }
        const currentTotal = prev.reduce(
          (s, l) => s + Number(l.item.points_price) * l.qty,
          0
        );
        const price = Number(line.item.points_price) * delta;
        if (m && currentTotal + price > Number(m.opening_balance)) {
          showFlash(
            false,
            `الرصيد لا يكفي — المتبقي: ${Number(m.opening_balance) - currentTotal} نقطة`
          );
          return prev;
        }
      }
      return prev
        .map((l) =>
          l.item.id === itemId
            ? { ...l, qty: Math.min(Math.max(0, l.qty + delta), l.item.stock) }
            : l
        )
        .filter((l) => l.qty > 0);
    });
  };

  // إنهاء جلسة الطفل الحالية (تغيير الطفل)
  const endSession = () => {
    setMember(null);
    setCart([]);
    setConfirming(false);
  };

  // ------------------------------------------------------------------
  // إتمام الشراء (بعد التأكيد)
  // ------------------------------------------------------------------
  const doCheckout = useCallback(async () => {
    const m = memberRef.current;
    const lines = cartRef.current;
    if (!m || !lines.length) return;
    setSubmitting(true);
    try {
      const res = await storeCheckout(
        m.id,
        lines.map((l) => ({ item_id: l.item.id, qty: l.qty }))
      );
      if (!res.ok) {
        setConfirming(false);
        showFlash(false, res.message);
        return;
      }
      setSuccess({
        invoiceNo: res.invoiceNo,
        totalPoints: res.totalPoints,
        newBalance: res.newBalance,
        memberName: m.name,
        lines: lines.map((l) => ({
          name: l.item.name,
          qty: l.qty,
          lineTotal: Number(l.item.points_price) * l.qty,
        })),
      });
      setConfirming(false);
      setCart([]);
      setMember(null);
      onCheckoutDone();
    } finally {
      setSubmitting(false);
    }
  }, [onCheckoutDone]);

  // ------------------------------------------------------------------
  // معالجة كود ممسوح (كارت طفل أو هدية)
  // ------------------------------------------------------------------
  const handleCode = useCallback(
    async (raw: string) => {
      const code = (raw || "").trim();
      if (!code || busyRef.current) return;

      const now = Date.now();
      if (
        lastScanRef.current &&
        lastScanRef.current.code === code &&
        now - lastScanRef.current.at < 2000
      )
        return;
      lastScanRef.current = { code, at: now };

      busyRef.current = true;
      setBusy(true);
      try {
        if (isItemCode(code)) {
          // ---- هدية ----
          if (!memberRef.current) {
            showFlash(false, "امسح كارت الطفل أولاً قبل مسح الهدايا");
            return;
          }
          const cached = itemsRef.current.find((i) => i.code === code);
          const item = cached ?? (await findItemByCode(code));
          if (!item) {
            showFlash(false, "لا توجد هدية بهذا الكود");
            return;
          }
          addToCart(item);
        } else {
          // ---- كارت طفل ----
          const m = await findMemberByCode(code);
          if (!m) {
            showFlash(false, "لا يوجد مخدوم بهذا الكود");
            return;
          }
          if (memberRef.current && memberRef.current.id === m.id) {
            showFlash(true, `الكارت ممسوح بالفعل — ${m.name}`);
            return;
          }
          if (memberRef.current && cartRef.current.length) {
            showFlash(
              false,
              "توجد عملية جارية لطفل آخر — أتمم العملية أو اضغط «مسح» أولاً"
            );
            return;
          }
          setMember(m);
          setCart([]);
          showFlash(
            true,
            `أهلاً ${m.name} — الرصيد: ${Number(m.opening_balance)} نقطة`
          );
        }
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [addToCart]
  );

  // ------------------------------------------------------------------
  // الكاميرا
  // ------------------------------------------------------------------
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const el = document.getElementById("store-qr-reader");
      if (!el) return;
      const instance = new Html5Qrcode("store-qr-reader", { verbose: false });
      scannerRef.current = instance;
      await instance.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 200, height: 200 } },
        (decodedText: string) => handleCode(decodedText),
        () => {}
      );
      setScanning(true);
    } catch {
      setCameraError("تعذّر تشغيل الكاميرا. تأكد من منح إذن الكاميرا واستخدام HTTPS.");
      setScanning(false);
    }
  }, [handleCode]);

  const stopCamera = useCallback(async () => {
    const inst = scannerRef.current as { stop: () => Promise<void>; clear: () => void } | null;
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

  useEffect(() => {
    return () => {
      const inst = scannerRef.current as { stop: () => Promise<void> } | null;
      if (inst) inst.stop().catch(() => {});
    };
  }, []);

  const availableItems = items.filter((i) => i.is_active && i.stock > 0);

  return (
    <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-3">
      {/* ---------- عمود الكاميرا ---------- */}
      <div className="animate-fade-up mb-3 rounded-xl bg-surface p-3 shadow-card border border-white/40">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-ink-muted">
          <ScanLine className="h-4 w-4 shrink-0 text-primary" />
          {member
            ? "امسح QR الهدايا لإضافتها للفاتورة"
            : "ابدأ بمسح كارت الطفل لعرض الاسم والرصيد"}
        </p>
        <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-xl bg-ink/90">
          <div
            id="store-qr-reader"
            className="h-full w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
          />
          {!scanning && (
            <div className="absolute inset-0 grid place-items-center">
              <div className="relative h-48 w-48">
                <span className="absolute right-0 top-0 h-8 w-8 rounded-tr-2xl border-r-4 border-t-4 border-primary" />
                <span className="absolute left-0 top-0 h-8 w-8 rounded-tl-2xl border-l-4 border-t-4 border-primary" />
                <span className="absolute bottom-0 right-0 h-8 w-8 rounded-br-2xl border-b-4 border-r-4 border-accent" />
                <span className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-2xl border-b-4 border-l-4 border-accent" />
              </div>
              <p className="absolute bottom-4 text-xs text-white/70">اضغط لبدء المسح</p>
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
            scanning ? "bg-rose-500" : "grad-green"
          }`}
        >
          {scanning ? (
            <>
              <CameraOff className="h-5 w-5" /> إيقاف الكاميرا
            </>
          ) : (
            <>
              <Camera className="h-5 w-5" /> بدء المسح
            </>
          )}
        </button>
        {cameraError && (
          <p className="mt-2 text-center text-xs text-rose-500">{cameraError}</p>
        )}

        {/* إدخال يدوي */}
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
            className="rounded-lg grad-green px-4 py-2.5 text-sm font-bold text-white shadow-soft active:scale-95 disabled:opacity-50"
          >
            تنفيذ
          </button>
        </div>

        {/* إضافة هدية بدون مسح (بعد مسح كارت الطفل) */}
        {member && (
          <button
            onClick={() => setShowPicker(true)}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-surface-muted py-2.5 text-sm font-bold text-ink active:scale-95"
          >
            <Plus className="h-4 w-4" /> إضافة هدية من القائمة
          </button>
        )}
      </div>

      {/* ---------- عمود الفاتورة الحيّة ---------- */}
      <div>
        {flash && (
          <div
            className={`animate-fade-up mb-3 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white shadow-soft ${
              flash.ok ? "grad-green" : "bg-rose-500"
            }`}
          >
            {flash.ok ? (
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            ) : (
              <X className="h-5 w-5 shrink-0" />
            )}
            {flash.text}
          </div>
        )}

        {/* بطاقة الطفل الممسوح */}
        {member ? (
          <div className="animate-fade-up mb-3 rounded-xl bg-surface p-3 shadow-card border border-white/40">
            <div className="flex items-center gap-3">
              {member.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={member.photo_url}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-primary/40"
                />
              ) : (
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                  <UserRound className="h-6 w-6" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink">{member.name}</p>
                <p className="flex items-center gap-1 text-[11px] font-bold text-amber-600">
                  <Wallet className="h-3.5 w-3.5" /> الرصيد: {balance} نقطة
                </p>
              </div>
              <button
                onClick={endSession}
                className="flex shrink-0 items-center gap-1 rounded-xl bg-surface-muted px-2.5 py-2 text-xs font-bold text-rose-500 active:scale-95"
                title="إنهاء وتغيير الطفل"
              >
                <LogOut className="h-3.5 w-3.5" /> تغيير
              </button>
            </div>

            {/* شريط الرصيد الحي */}
            <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
              <div className="rounded-lg bg-surface-muted px-1 py-2">
                <p className="text-[10px] font-bold text-ink-muted">الرصيد</p>
                <p className="text-sm font-bold text-ink" dir="ltr">
                  {balance}
                </p>
              </div>
              <div className="rounded-lg bg-amber-500/10 px-1 py-2">
                <p className="text-[10px] font-bold text-amber-600">الإجمالي</p>
                <p className="text-sm font-bold text-amber-600" dir="ltr">
                  {total}
                </p>
              </div>
              <div
                className={`rounded-lg px-1 py-2 ${
                  remaining === 0 ? "bg-rose-500/10" : "bg-green-500/10"
                }`}
              >
                <p
                  className={`text-[10px] font-bold ${
                    remaining === 0 ? "text-rose-500" : "text-green-600"
                  }`}
                >
                  الباقي
                </p>
                <p
                  className={`text-sm font-bold ${
                    remaining === 0 ? "text-rose-500" : "text-green-600"
                  }`}
                  dir="ltr"
                >
                  {remaining}
                </p>
              </div>
            </div>
            {remaining === 0 && cart.length > 0 && (
              <p className="mt-2 rounded-lg bg-rose-500/10 px-2 py-1.5 text-center text-[11px] font-bold text-rose-500">
                استُهلك الرصيد بالكامل — لا يمكن إضافة هدايا أخرى
              </p>
            )}
          </div>
        ) : (
          <div className="animate-fade-up mb-3 flex items-center gap-3 rounded-xl bg-surface p-4 shadow-card border border-dashed border-primary/40">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
              <ScanLine className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm font-bold text-ink">في انتظار كارت الطفل</p>
              <p className="text-[11px] text-ink-muted">
                امسح كارت الطفل لعرض اسمه ورصيده وبدء الفاتورة
              </p>
            </div>
          </div>
        )}

        {/* الفاتورة الحية */}
        <div className="animate-fade-up rounded-xl bg-surface p-3 shadow-card border border-white/40">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm font-bold text-ink">
              <ShoppingCart className="h-4 w-4 text-green-600" />
              الفاتورة ({cart.reduce((s, l) => s + l.qty, 0)})
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="flex items-center gap-1 rounded-xl bg-surface-muted px-2.5 py-1.5 text-xs font-bold text-rose-500 active:scale-95"
              >
                <Trash2 className="h-3.5 w-3.5" /> مسح
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <p className="py-6 text-center text-xs text-ink-muted">
              {member
                ? "الفاتورة فارغة — امسح QR الهدايا المختارة"
                : "امسح كارت الطفل أولاً ثم ابدأ مسح الهدايا"}
            </p>
          ) : (
            <div className="space-y-2">
              {cart.map((l) => (
                <div
                  key={l.item.id}
                  className="flex items-center gap-2.5 rounded-lg bg-surface-muted p-2"
                >
                  {l.item.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={l.item.photo_url}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-surface text-lg">
                      🎁
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{l.item.name}</p>
                    <p className="text-[11px] font-bold text-amber-600">
                      {Number(l.item.points_price)} نقطة × {l.qty} ={" "}
                      {Number(l.item.points_price) * l.qty}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => changeQty(l.item.id, -1)}
                      className="grid h-8 w-8 place-items-center rounded-lg bg-surface text-ink active:scale-95"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-6 text-center text-sm font-bold text-ink" dir="ltr">
                      {l.qty}
                    </span>
                    <button
                      onClick={() => changeQty(l.item.id, 1)}
                      disabled={
                        l.qty >= l.item.stock ||
                        remaining < Number(l.item.points_price)
                      }
                      className="grid h-8 w-8 place-items-center rounded-lg bg-surface text-ink disabled:opacity-30 active:scale-95"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              {/* الإجمالي والباقي */}
              <div className="flex items-center justify-between rounded-lg grad-amber px-3 py-2.5 text-white">
                <span className="flex items-center gap-1.5 text-sm font-bold">
                  <Coins className="h-4 w-4" /> الإجمالي
                </span>
                <span className="text-lg font-bold" dir="ltr">
                  {total}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-green-500/10 px-3 py-2 text-green-700">
                <span className="flex items-center gap-1.5 text-sm font-bold">
                  <Wallet className="h-4 w-4" /> الباقي بعد الشراء
                </span>
                <span className="text-base font-bold" dir="ltr">
                  {remaining}
                </span>
              </div>

              {/* زر إتمام عملية الشراء */}
              <button
                onClick={() => setConfirming(true)}
                disabled={!member || cart.length === 0 || busy}
                className="btn-gradient flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold shadow-soft active:scale-95 disabled:opacity-50"
              >
                <BadgeCheck className="h-5 w-5" /> إتمام عملية الشراء
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ---------- منتقي الهدايا اليدوي ---------- */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm lg:items-center lg:p-4">
          <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-t-2xl bg-surface shadow-2xl lg:rounded-2xl">
            <div className="flex items-center justify-between border-b border-white/30 p-4">
              <p className="font-bold text-ink">اختر هدية</p>
              <button
                onClick={() => setShowPicker(false)}
                className="grid h-9 w-9 place-items-center rounded-lg bg-surface-muted text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 space-y-1.5 overflow-y-auto p-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
              {availableItems.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink-muted">
                  لا توجد هدايا متاحة
                </p>
              ) : (
                availableItems.map((i) => {
                  const affordable = remaining >= Number(i.points_price);
                  return (
                    <button
                      key={i.id}
                      onClick={() => {
                        addToCart(i);
                        setShowPicker(false);
                      }}
                      disabled={!affordable}
                      className="flex w-full items-center gap-2.5 rounded-xl bg-surface-muted/60 p-2.5 text-right active:scale-[0.99] disabled:opacity-40"
                    >
                      {i.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={i.photo_url} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface text-lg">🎁</span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">{i.name}</span>
                        <span className="block text-[11px] text-ink-muted">
                          المتاح: {i.stock}
                          {!affordable && " · الرصيد لا يكفي"}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-bold text-amber-600">
                        {Number(i.points_price)} نقطة
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------- مودال تأكيد إتمام الشراء ---------- */}
      {confirming && member && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-2xl">
            <div className="mb-3 flex flex-col items-center gap-2 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-full grad-amber text-white shadow-soft">
                <ReceiptText className="h-7 w-7" />
              </span>
              <p className="text-lg font-bold text-ink">تأكيد عملية الشراء</p>
              <p className="text-xs text-ink-muted">{member.name}</p>
            </div>

            <div className="mb-3 space-y-1.5 rounded-xl bg-surface-muted p-3">
              {cart.map((l) => (
                <div key={l.item.id} className="flex items-center justify-between text-sm">
                  <span className="text-ink">
                    {l.item.name} <span className="text-ink-muted">×{l.qty}</span>
                  </span>
                  <span className="font-bold text-ink" dir="ltr">
                    {Number(l.item.points_price) * l.qty}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-white/40 pt-1.5 text-sm font-bold">
                <span className="text-ink">الإجمالي المخصوم</span>
                <span className="text-accent" dir="ltr">
                  -{total}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm font-bold">
                <span className="text-ink">الرصيد بعد الشراء</span>
                <span className="text-green-600" dir="ltr">
                  {remaining}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setConfirming(false)}
                disabled={submitting}
                className="flex-1 rounded-xl bg-surface-muted py-3 text-sm font-bold text-ink active:scale-95 disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                onClick={doCheckout}
                disabled={submitting}
                className="btn-gradient flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold shadow-soft active:scale-95 disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> جارٍ التنفيذ...
                  </>
                ) : (
                  <>
                    <BadgeCheck className="h-4 w-4" /> تأكيد الشراء
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- مودال نجاح العملية (الفاتورة) ---------- */}
      {success && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-2xl">
            <div className="mb-3 flex flex-col items-center gap-2 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-full grad-green text-white shadow-soft">
                <CheckCircle2 className="h-7 w-7" />
              </span>
              <p className="text-lg font-bold text-ink">تمت العملية بنجاح</p>
              <p className="flex items-center gap-1 text-xs text-ink-muted">
                <ReceiptText className="h-3.5 w-3.5" />
                فاتورة #{success.invoiceNo} — {success.memberName}
              </p>
            </div>

            <div className="mb-3 space-y-1.5 rounded-xl bg-surface-muted p-3">
              {success.lines.map((l, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-ink">
                    {l.name} <span className="text-ink-muted">×{l.qty}</span>
                  </span>
                  <span className="font-bold text-ink" dir="ltr">
                    {l.lineTotal}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-white/40 pt-1.5 text-sm font-bold">
                <span className="text-ink">الإجمالي المخصوم</span>
                <span className="text-accent" dir="ltr">
                  -{success.totalPoints}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm font-bold">
                <span className="text-ink">الرصيد المتبقي</span>
                <span className="text-green-600" dir="ltr">
                  {success.newBalance}
                </span>
              </div>
            </div>

            <p className="mb-3 text-center text-[11px] text-ink-muted">
              الفاتورة الكاملة وصلت لصفحة الطفل في بوابة المخدوم 📱
            </p>

            <button
              onClick={() => setSuccess(null)}
              className="btn-gradient w-full rounded-xl py-3 text-sm font-bold shadow-soft active:scale-95"
            >
              تم
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
