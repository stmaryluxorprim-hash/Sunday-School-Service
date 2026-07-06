"use client";

import { useMemo, useState } from "react";
import {
  Users,
  Layers,
  CheckSquare,
  Printer,
  Scissors,
  Search,
  Loader2,
} from "lucide-react";
import type { MemberRow, ClassRow } from "@/lib/data/types";
import type { CardPrintOptions, PrintMode, BulkLayout } from "@/lib/print/types";
import { bulkCardDims } from "@/lib/print/print-engine";

type SourceMode = "all" | "class" | "selected";

const LINE_COLOR_PRESETS = ["#000000", "#6366f1", "#ef4444", "#10b981", "#94a3b8"];

/** لوحة الطباعة الجماعية على ورق A4 — كل خيارات الشبكة وخطوط القص والطي. */
export function BulkPanel({
  members,
  classes,
  opts,
  onChange,
  onPrint,
  printing,
  progress,
}: {
  members: MemberRow[];
  classes: ClassRow[];
  opts: CardPrintOptions;
  onChange: (patch: Partial<CardPrintOptions>) => void;
  onPrint: (selected: MemberRow[], printSide: PrintMode) => void;
  printing: boolean;
  progress: { done: number; total: number } | null;
}) {
  const [mode, setMode] = useState<SourceMode>("all");
  const [classId, setClassId] = useState<string>("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [printSide, setPrintSide] = useState<PrintMode>(
    opts.mode === "back" ? "back" : opts.mode === "front" ? "front" : "both"
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) => m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q)
    );
  }, [members, search]);

  const resolved = useMemo(() => {
    if (mode === "all") return members;
    if (mode === "class") return members.filter((m) => m.class_id === classId);
    return members.filter((m) => selected.has(m.id));
  }, [mode, members, classId, selected]);

  const layout: BulkLayout = opts.bulkLayout;
  const dims = bulkCardDims(opts.cardSize, printSide, opts.bulkGapX, opts.bulkGapY, layout);
  const totalCards =
    printSide === "both" && layout === "sideBySide" ? resolved.length * 2 : resolved.length;
  const pages = dims.total > 0 ? Math.ceil(totalCards / dims.total) : 0;

  const toggleMember = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const srcBtn = (m: SourceMode, label: string, Icon: typeof Users) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition flex items-center justify-center gap-1.5 ${
        mode === m
          ? "border-primary bg-primary-soft text-primary"
          : "border-border bg-surface text-ink-muted hover:bg-surface-muted"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );

  const sideBtn = (s: PrintMode, label: string) => (
    <button
      type="button"
      onClick={() => setPrintSide(s)}
      className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-bold transition ${
        printSide === s
          ? "border-blue-500 bg-blue-500 text-white"
          : "border-border bg-surface text-ink-muted hover:bg-surface-muted"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-5">
      {/* مصدر البطاقات */}
      <div>
        <div className="mb-2 text-sm font-bold text-ink">مصدر البطاقات</div>
        <div className="flex gap-2">
          {srcBtn("all", "الكل", Users)}
          {srcBtn("class", "فصل", Layers)}
          {srcBtn("selected", "تحديد", CheckSquare)}
        </div>
      </div>

      {mode === "class" && (
        <select
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink"
        >
          <option value="">— اختر الفصل —</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}

      {mode === "selected" && (
        <div className="rounded-xl border border-border bg-surface-muted p-3">
          <div className="mb-2 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-ink-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث بالاسم أو الكود…"
                className="w-full rounded-lg border border-border bg-surface py-2 pl-2 pr-8 text-sm text-ink"
              />
            </div>
            <button
              type="button"
              onClick={() => setSelected(new Set(filtered.map((m) => m.id)))}
              className="rounded-lg border border-border bg-surface px-2.5 py-2 text-xs font-semibold text-ink-muted hover:bg-surface-muted"
            >
              الكل
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="rounded-lg border border-border bg-surface px-2.5 py-2 text-xs font-semibold text-ink-muted hover:bg-surface-muted"
            >
              إلغاء
            </button>
          </div>
          <div className="max-h-52 space-y-1 overflow-y-auto">
            {filtered.map((m) => (
              <label
                key={m.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink hover:bg-surface"
              >
                <input
                  type="checkbox"
                  checked={selected.has(m.id)}
                  onChange={() => toggleMember(m.id)}
                  className="h-4 w-4 accent-indigo-500"
                />
                <span className="flex-1 truncate">{m.name}</span>
                <span className="text-xs text-ink-muted">{m.code}</span>
              </label>
            ))}
            {filtered.length === 0 && (
              <div className="py-3 text-center text-xs text-ink-muted">لا نتائج</div>
            )}
          </div>
          <div className="mt-2 text-xs font-semibold text-ink-muted">
            المحدد: {selected.size}
          </div>
        </div>
      )}

      {/* المسافات بين البطاقات */}
      <div className="rounded-xl border border-border bg-surface-muted p-3">
        <div className="mb-2 text-sm font-bold text-ink">المسافات بين البطاقات (مم)</div>
        <label className="mb-1 block text-xs text-ink-muted">
          أفقياً: <b className="text-ink">{opts.bulkGapX} مم</b>
        </label>
        <input
          type="range"
          min={0}
          max={20}
          value={opts.bulkGapX}
          onChange={(e) => onChange({ bulkGapX: Number(e.target.value) })}
          className="w-full accent-indigo-500"
        />
        <label className="mb-1 mt-2 block text-xs text-ink-muted">
          رأسياً: <b className="text-ink">{opts.bulkGapY} مم</b>
        </label>
        <input
          type="range"
          min={0}
          max={20}
          value={opts.bulkGapY}
          onChange={(e) => onChange({ bulkGapY: Number(e.target.value) })}
          className="w-full accent-violet-500"
        />
        <button
          type="button"
          onClick={() => onChange({ bulkGapY: opts.bulkGapX })}
          className="mt-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-ink-muted hover:bg-surface-muted"
        >
          توحيد المسافتين
        </button>
      </div>

      {/* خطوط الإرشاد */}
      <div className="rounded-xl border border-border bg-surface-muted p-3">
        <div className="mb-2 flex items-center gap-1.5 text-sm font-bold text-ink">
          <Scissors className="h-4 w-4 text-ink-muted" />
          خطوط الإرشاد
        </div>
        <label className="flex cursor-pointer items-center gap-2 py-1 text-sm text-ink">
          <input
            type="checkbox"
            checked={opts.bulkShowFoldLine}
            onChange={(e) => onChange({ bulkShowFoldLine: e.target.checked })}
            className="h-4 w-4 accent-indigo-500"
          />
          خط الطيّ (منتصف البطاقة)
        </label>
        <label className="flex cursor-pointer items-center gap-2 py-1 text-sm text-ink">
          <input
            type="checkbox"
            checked={opts.bulkShowCutLines}
            onChange={(e) => onChange({ bulkShowCutLines: e.target.checked })}
            className="h-4 w-4 accent-indigo-500"
          />
          خطوط القصّ حول البطاقات
        </label>
        <div className={opts.bulkShowCutLines ? "" : "pointer-events-none opacity-40"}>
          <label className="mb-1 mt-2 block text-xs text-ink-muted">
            مسافة خط القص عن البطاقة (Bleed):{" "}
            <b className="text-ink">{opts.bulkCutLineOffset} مم</b>
          </label>
          <input
            type="range"
            min={0}
            max={10}
            value={opts.bulkCutLineOffset}
            onChange={(e) => onChange({ bulkCutLineOffset: Number(e.target.value) })}
            className="w-full accent-indigo-500"
          />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-ink-muted">لون الخطوط:</span>
          <input
            type="color"
            value={opts.bulkLineColor}
            onChange={(e) => onChange({ bulkLineColor: e.target.value })}
            className="h-7 w-9 cursor-pointer rounded border border-border bg-surface"
          />
          {LINE_COLOR_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange({ bulkLineColor: c })}
              className={`h-5 w-5 rounded-full border-2 ${
                opts.bulkLineColor === c ? "border-primary" : "border-border"
              }`}
              style={{ background: c }}
              aria-label={c}
            />
          ))}
        </div>
      </div>

      {/* وجه الطباعة */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/30">
        <div className="mb-2 text-sm font-bold text-ink">وجه الطباعة</div>
        <div className="flex gap-2">
          {sideBtn("front", "الأمامي فقط")}
          {sideBtn("both", "الوجهان")}
          {sideBtn("back", "الخلفي فقط")}
        </div>
        {printSide === "both" && (
          <div className="mt-3">
            <div className="mb-1.5 text-xs font-semibold text-ink-muted">ترتيب الوجهين</div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onChange({ bulkLayout: "folded" })}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-bold ${
                  layout === "folded"
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border bg-surface text-ink-muted"
                }`}
              >
                فوق بعض (طيّ)
              </button>
              <button
                type="button"
                onClick={() => onChange({ bulkLayout: "sideBySide" })}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-bold ${
                  layout === "sideBySide"
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border bg-surface text-ink-muted"
                }`}
              >
                جنب بعض
              </button>
            </div>
          </div>
        )}
        <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
          للطباعة على الوجهين بالطابعة: اطبع &quot;الأمامي فقط&quot; ثم أعد إدخال الورق
          واطبع &quot;الخلفي فقط&quot;.
        </p>
      </div>

      {/* العدّاد المباشر */}
      <div className="rounded-xl border border-border bg-surface-muted p-3 text-center text-sm text-ink">
        <b>{resolved.length}</b> بطاقة · <b>{dims.total}</b> لكل صفحة (
        {dims.perRow}×{dims.perCol}) · <b>{pages}</b> صفحة A4
      </div>

      {printing && progress && (
        <div className="flex items-center justify-center gap-2 text-sm font-semibold text-primary">
          <Loader2 className="h-4 w-4 animate-spin" />
          جاري التجهيز… {progress.done} / {progress.total}
        </div>
      )}

      <button
        type="button"
        disabled={printing || resolved.length === 0}
        onClick={() => onPrint(resolved, printSide)}
        className="btn-gradient flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
      >
        <Printer className="h-4 w-4" />
        طباعة {resolved.length} بطاقة على A4
      </button>
    </div>
  );
}
