"use client";

/**
 * مودال طباعة بطاقات الأصناف — اختيار الأصناف + عدد النسخ لكل صنف
 * + عدد البطاقات في الصفحة (1 كبيرة أو 4).
 */

import { useMemo, useState } from "react";
import { X, Printer, Loader2, Minus, Plus, Search } from "lucide-react";
import { StoreItemRow } from "@/lib/store/types";
import { printItemLabels, LabelsPerPage } from "@/lib/store/label-print";

export function LabelPrintSheet({
  items,
  serviceName,
  preselectedId,
  onClose,
}: {
  items: StoreItemRow[];
  serviceName: string;
  /** صنف محدد مسبقاً (طباعة من كارت الصنف مباشرة). */
  preselectedId?: string | null;
  onClose: () => void;
}) {
  const [perPage, setPerPage] = useState<LabelsPerPage>(4);
  const [search, setSearch] = useState("");
  const [copies, setCopies] = useState<Record<string, number>>(
    preselectedId ? { [preselectedId]: 1 } : {}
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim();
    if (!q) return items;
    return items.filter((i) => i.name.includes(q) || i.code.includes(q));
  }, [items, search]);

  const totalCards = Object.values(copies).reduce((s, n) => s + (n > 0 ? n : 0), 0);

  const setCount = (id: string, n: number) =>
    setCopies((prev) => {
      const next = { ...prev };
      if (n <= 0) delete next[id];
      else next[id] = n;
      return next;
    });

  const doPrint = async () => {
    const jobs = items
      .filter((i) => (copies[i.id] ?? 0) > 0)
      .map((i) => ({ item: i, copies: copies[i.id] }));
    if (!jobs.length) return;
    setBusy(true);
    const res = await printItemLabels(jobs, perPage, serviceName);
    setBusy(false);
    setMsg(res.message);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm lg:items-center lg:p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-2xl bg-surface shadow-2xl lg:rounded-2xl">
        {/* رأس */}
        <div className="flex items-center gap-3 border-b border-white/30 p-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl grad-green text-white shadow-soft">
            <Printer className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-ink">طباعة بطاقات الأصناف</p>
            <p className="text-xs text-ink-muted">صورة + اسم + سعر + QR لكل صنف</p>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg bg-surface-muted text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 p-4 pb-2">
          {/* عدد البطاقات في الصفحة */}
          <div>
            <p className="mb-1.5 text-xs font-bold text-ink-muted">حجم البطاقة على A4</p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { v: 1 as LabelsPerPage, label: "بطاقة كبيرة", sub: "1 في الصفحة" },
                  { v: 4 as LabelsPerPage, label: "4 بطاقات", sub: "شبكة 2×2" },
                ]
              ).map((o) => (
                <button
                  key={o.v}
                  onClick={() => setPerPage(o.v)}
                  className={`rounded-xl px-3 py-2.5 text-sm font-bold transition active:scale-95 ${
                    perPage === o.v
                      ? "grad-green text-white shadow-soft"
                      : "bg-surface-muted text-ink-muted"
                  }`}
                >
                  {o.label}
                  <span className="block text-[10px] font-semibold opacity-80">{o.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* بحث */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث عن صنف..."
              className="w-full rounded-xl border border-white/40 bg-surface-muted py-2.5 pr-9 pl-3 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        {/* قائمة الأصناف مع عدد النسخ */}
        <div className="flex-1 space-y-1.5 overflow-y-auto px-4 pb-2">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-muted">لا توجد أصناف</p>
          ) : (
            filtered.map((i) => {
              const n = copies[i.id] ?? 0;
              return (
                <div
                  key={i.id}
                  className={`flex items-center gap-2.5 rounded-xl p-2 transition ${
                    n > 0 ? "bg-green-50 ring-1 ring-green-300" : "bg-surface-muted/60"
                  }`}
                >
                  {i.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.photo_url} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface text-lg">🎁</span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{i.name}</span>
                    <span className="block text-[11px] text-amber-600 font-bold">
                      {Number(i.points_price)} نقطة
                    </span>
                  </span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      onClick={() => setCount(i.id, n - 1)}
                      disabled={n <= 0}
                      className="grid h-8 w-8 place-items-center rounded-lg bg-surface text-ink disabled:opacity-30 active:scale-95"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-6 text-center text-sm font-bold text-ink" dir="ltr">
                      {n}
                    </span>
                    <button
                      onClick={() => setCount(i.id, n + 1)}
                      className="grid h-8 w-8 place-items-center rounded-lg bg-surface text-ink active:scale-95"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* زر الطباعة */}
        <div className="border-t border-white/30 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          {msg && <p className="mb-2 text-center text-xs font-semibold text-ink-muted">{msg}</p>}
          <button
            onClick={doPrint}
            disabled={busy || totalCards === 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl grad-green py-3 text-sm font-bold text-white shadow-soft active:scale-95 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
            طباعة {totalCards > 0 ? `(${totalCards} بطاقة)` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
