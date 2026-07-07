"use client";

/**
 * نقطة البيع (POS) — سيناريو الشراء:
 *   1. الخادم يمسح QR الأصناف المختارة (تُضاف للسلة).
 *   2. المخدوم يعطي كارته — الخادم يمسح QR الكارت.
 *   3. تُخصم النقاط ذرّياً وتُنشأ فاتورة تظهر في بوابة المخدوم.
 *
 * الماسح واحد ذكي: كود يبدأ بـ ITEM- → صنف للسلة، غير ذلك → كارت مخدوم.
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
  const [cart, setCart] = useState<CartLine[]>([]);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [success, setSuccess] = useState<SuccessInfo | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const scannerRef = useRef<unknown>(null);
  const lastScanRef = useRef<{ code: string; at: number } | null>(null);
  const busyRef = useRef(false);
  const cartRef = useRef(cart);
  cartRef.current = cart;
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const total = cart.reduce((s, l) => s + Number(l.item.points_price) * l.qty, 0);

  const showFlash = (ok: boolean, text: string) => {
    setFlash({ ok, text });
    setTimeout(() => setFlash(null), 2600);
    if (ok && navigator.vibrate) navigator.vibrate(60);
  };

  // إضافة صنف للسلة
  const addToCart = useCallback((item: StoreItemRow) => {
    if (!item.is_active) {
      showFlash(false, `«${item.name}» موقوف حالياً`);
      return;
    }
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.item.id === item.id);
      const currentQty = idx >= 0 ? prev[idx].qty : 0;
      if (currentQty + 1 > item.stock) {
        showFlash(false, `الكمية غير كافية من «${item.name}» — المتاح: ${item.stock}`);
        return prev;
      }
      showFlash(true, `أُضيف «${item.name}» للسلة`);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...prev, { item, qty: 1 }];
    });
  }, []);

  const changeQty = (itemId: string, delta: number) =>
    setCart((prev) =>
      prev
        .map((l) => {
          if (l.item.id !== itemId) return l;
          const q = Math.min(Math.max(0, l.qty + delta), l.item.stock);
          return { ...l, qty: q };
        })
        .filter((l) => l.qty > 0)
    );

  // إتمام الشراء
  const doCheckout = useCallback(
    async (m: MemberRow) => {
      const lines = cartRef.current;
      if (!lines.length) {
        showFlash(false, "السلة فارغة — امسح الأصناف أولاً");
        return;
      }
      const res = await storeCheckout(
        m.id,
        lines.map((l) => ({ item_id: l.item.id, qty: l.qty }))
      );
      if (!res.ok) {
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
      setCart([]);
      onCheckoutDone();
    },
    [onCheckoutDone]
  );

  // معالجة كود ممسوح (صنف أو كارت مخدوم)
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
          const cached = itemsRef.current.find((i) => i.code === code);
          const item = cached ?? (await findItemByCode(code));
          if (!item) {
            showFlash(false, "لا يوجد صنف بهذا الكود");
            return;
          }
          addToCart(item);
        } else {
          const m = await findMemberByCode(code);
          if (!m) {
            showFlash(false, "لا يوجد مخدوم بهذا الكود");
            return;
          }
          if (cartRef.current.length) {
            await doCheckout(m);
          } else {
            showFlash(false, "السلة فارغة — امسح الأصناف أولاً ثم كارت المخدوم");
          }
        }
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [addToCart, doCheckout]
  );

  // الكاميرا
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
        <p className="mb-2 text-xs font-bold text-ink-muted">
          امسح QR الأصناف لإضافتها للسلة، ثم امسح كارت المخدوم لإتمام العملية
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

        {/* إضافة صنف بدون مسح */}
        <button
          onClick={() => setShowPicker(true)}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-surface-muted py-2.5 text-sm font-bold text-ink active:scale-95"
        >
          <Plus className="h-4 w-4" /> إضافة صنف من القائمة
        </button>
      </div>
      {/* ---------- عمود السلة ---------- */}
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

        <div className="animate-fade-up rounded-xl bg-surface p-3 shadow-card border border-white/40">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm font-bold text-ink">
              <ShoppingCart className="h-4 w-4 text-green-600" />
              السلة ({cart.reduce((s, l) => s + l.qty, 0)})
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="flex items-center gap-1 rounded-xl bg-surface-muted px-2.5 py-1.5 text-xs font-bold text-rose-500 active:scale-95"
              >
                <Trash2 className="h-3.5 w-3.5" /> تفريغ
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <p className="py-6 text-center text-xs text-ink-muted">
              السلة فارغة — امسح QR الهدايا المختارة
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
                      disabled={l.qty >= l.item.stock}
                      className="grid h-8 w-8 place-items-center rounded-lg bg-surface text-ink disabled:opacity-30 active:scale-95"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              {/* الإجمالي */}
              <div className="flex items-center justify-between rounded-lg grad-amber px-3 py-2.5 text-white">
                <span className="flex items-center gap-1.5 text-sm font-bold">
                  <Coins className="h-4 w-4" /> الإجمالي
                </span>
                <span className="text-lg font-bold" dir="ltr">
                  {total}
                </span>
              </div>

              <p className="flex items-center justify-center gap-1.5 rounded-lg bg-surface-muted px-3 py-2.5 text-center text-xs font-bold text-ink-muted">
                <UserRound className="h-4 w-4" />
                الآن امسح كارت المخدوم لإتمام العملية وخصم النقاط
              </p>
            </div>
          )}
        </div>
      </div>
      {/* ---------- منتقي الأصناف اليدوي ---------- */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm lg:items-center lg:p-4">
          <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-t-2xl bg-surface shadow-2xl lg:rounded-2xl">
            <div className="flex items-center justify-between border-b border-white/30 p-4">
              <p className="font-bold text-ink">اختر صنفاً</p>
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
                  لا توجد أصناف متاحة
                </p>
              ) : (
                availableItems.map((i) => (
                  <button
                    key={i.id}
                    onClick={() => {
                      addToCart(i);
                      setShowPicker(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl bg-surface-muted/60 p-2.5 text-right active:scale-[0.99]"
                  >
                    {i.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={i.photo_url} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface text-lg">🎁</span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{i.name}</span>
                      <span className="block text-[11px] text-ink-muted">المتاح: {i.stock}</span>
                    </span>
                    <span className="shrink-0 text-sm font-bold text-amber-600">
                      {Number(i.points_price)} نقطة
                    </span>
                  </button>
                ))
              )}
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
              الفاتورة الكاملة متاحة الآن في بوابة المخدوم 📱
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
