"use client";

import { useState } from "react";
import { X, Plus, Minus, Loader2 } from "lucide-react";

export function PointsDialog({
  open,
  mode,
  memberName,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  mode: "add" | "deduct";
  memberName: string;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (amount: number, reason: string) => void;
}) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  if (!open) return null;

  const title = mode === "add" ? "إضافة نقاط" : "خصم نقاط";
  const Icon = mode === "add" ? Plus : Minus;

  const submit = () => {
    const v = Math.abs(parseFloat(amount) || 0);
    if (!v) return;
    onConfirm(mode === "add" ? v : -v, reason.trim());
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={busy ? undefined : onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-50">
        <div className="mx-auto max-w-md rounded-t-3xl bg-surface p-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] shadow-2xl">
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-surface-muted" />
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl btn-gradient text-white">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink">{title}</h3>
                <p className="truncate text-xs text-ink-muted">{memberName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={busy}
              className="grid h-8 w-8 place-items-center rounded-xl bg-surface-muted text-ink active:scale-95 disabled:opacity-50"
              aria-label="إغلاق"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <label className="mb-1 block text-xs font-semibold text-ink-muted">
            عدد النقاط
          </label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
            inputMode="decimal"
            dir="ltr"
            autoFocus
            placeholder="0"
            className="mb-3 w-full rounded-2xl border border-primary-soft bg-surface-muted px-4 py-3 text-center text-lg font-bold text-ink outline-none focus:border-primary"
          />

          <label className="mb-1 block text-xs font-semibold text-ink-muted">
            السبب (اختياري)
          </label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="مثال: حضور القداس / مسابقة..."
            className="mb-4 w-full rounded-2xl border border-primary-soft bg-surface-muted px-4 py-2.5 text-sm text-ink outline-none focus:border-primary"
          />

          <button
            onClick={submit}
            disabled={busy || !amount}
            className="flex w-full items-center justify-center gap-2 rounded-2xl btn-gradient py-3.5 text-sm font-bold text-white shadow-soft active:scale-95 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
            {mode === "add" ? "إضافة" : "خصم"}
          </button>
        </div>
      </div>
    </>
  );
}
