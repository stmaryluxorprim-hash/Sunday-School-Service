"use client";

import { X } from "lucide-react";

type DateSheetProps = {
  open: boolean;
  onClose: () => void;
  value: string; // yyyy-mm-dd
  onChange: (value: string) => void;
};

export function DateSheet({ open, onClose, value, onChange }: DateSheetProps) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto max-w-md rounded-t-3xl bg-surface p-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] shadow-2xl">
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-surface-muted" />
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-ink">اختيار التاريخ</h3>
            <button
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-xl bg-surface-muted text-ink active:scale-95"
              aria-label="إغلاق"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-2xl border border-primary-soft bg-surface-muted px-4 py-3 text-ink outline-none focus:border-primary"
          />

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onChange(new Date().toISOString().slice(0, 10));
              }}
              className="rounded-2xl bg-primary-soft py-3 text-sm font-semibold text-primary active:scale-95"
            >
              اليوم
            </button>
            <button
              onClick={onClose}
              className="rounded-2xl btn-gradient py-3 text-sm font-bold text-white active:scale-95"
            >
              تأكيد
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
