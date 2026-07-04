"use client";

import { useState } from "react";
import {
  ArrowUpNarrowWide,
  ArrowDownWideNarrow,
  ChevronDown,
  Layers,
  ListFilter,
  Eye,
  Wand2,
  Check,
  Coins,
} from "lucide-react";
import {
  ClassRow,
  classDisplayName,
  SortKey,
  SortDir,
  SORT_OPTIONS,
  ShowFilter,
  SHOW_FILTERS,
  ActionKey,
  ACTION_OPTIONS,
} from "@/lib/data/types";

export type ControlsState = {
  classId: string | "all";
  sortKey: SortKey;
  sortDir: SortDir;
  filters: ShowFilter[];
  action: ActionKey;
  points: number; // عدد النقاط بجانب "الوظيفة" (حضور/إضافة/خصم)
};

export const DEFAULT_CONTROLS: ControlsState = {
  classId: "all",
  sortKey: "name",
  sortDir: "asc",
  filters: [],
  action: "attendance",
  points: 1,
};

const selBase =
  "w-full appearance-none rounded-lg border border-primary-soft bg-surface-muted px-3 py-2.5 pe-9 text-sm font-semibold text-ink outline-none focus:border-primary";

/** صف واحد: كلمة (label) + عنصر تحكم بجانبها — لكل صف لون أيقونة مميّز. */
function Row({
  icon: Icon,
  label,
  iconColor = "text-primary",
  children,
}: {
  icon: typeof Layers;
  label: string;
  iconColor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex w-24 shrink-0 items-center gap-1.5 text-sm font-bold text-ink">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        <span>{label}</span>
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function DataControls({
  classes,
  value,
  onChange,
}: {
  classes: ClassRow[];
  value: ControlsState;
  onChange: (v: ControlsState) => void;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  const set = (patch: Partial<ControlsState>) => onChange({ ...value, ...patch });

  const toggleFilter = (f: ShowFilter) => {
    const has = value.filters.includes(f);
    set({
      filters: has
        ? value.filters.filter((x) => x !== f)
        : [...value.filters, f],
    });
  };

  return (
    <div className="animate-fade-up card-topline mb-3 space-y-3 rounded-xl bg-surface p-3 pt-4 shadow-card border border-white/40">
      {/* 1) الفصل */}
      <Row icon={Layers} label="الفصل" iconColor="text-teal-600">
        <div className="relative">
          <select
            className={selBase}
            value={value.classId}
            onChange={(e) => set({ classId: e.target.value })}
          >
            <option value="all">كل الفصول</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {classDisplayName(c)}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute inset-y-0 left-3 my-auto h-4 w-4 text-ink-muted" />
        </div>
      </Row>

      {/* 2) ترتيب حسب */}
      <Row icon={ListFilter} label="ترتيب حسب" iconColor="text-violet-600">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <select
              className={selBase}
              value={value.sortKey}
              onChange={(e) => set({ sortKey: e.target.value as SortKey })}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute inset-y-0 left-3 my-auto h-4 w-4 text-ink-muted" />
          </div>
          <button
            type="button"
            onClick={() =>
              set({ sortDir: value.sortDir === "asc" ? "desc" : "asc" })
            }
            title={value.sortDir === "asc" ? "تصاعدي" : "تنازلي"}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-primary-soft bg-surface-muted text-violet-600 active:scale-95"
          >
            {value.sortDir === "asc" ? (
              <ArrowUpNarrowWide className="h-5 w-5" />
            ) : (
              <ArrowDownWideNarrow className="h-5 w-5" />
            )}
          </button>
        </div>
      </Row>

      {/* 3) إظهار (فلاتر متعددة) */}
      <Row icon={Eye} label="إظهار" iconColor="text-sky-600">
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-lg border border-primary-soft bg-surface-muted px-3 py-2.5 text-sm font-semibold text-ink active:scale-[0.99]"
        >
          <span className="truncate">
            {value.filters.length === 0
              ? "الكل"
              : `${value.filters.length} فلتر مختار`}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-ink-muted transition-transform ${
              filtersOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </Row>

      {filtersOpen && (
        <div className="flex flex-wrap gap-2 ps-[6.75rem]">
          {SHOW_FILTERS.map((f) => {
            const active = value.filters.includes(f.value);
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => toggleFilter(f.value)}
                className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                  active
                    ? "grad-primary shadow-soft"
                    : "bg-surface-muted text-ink-muted border border-primary-soft"
                }`}
              >
                {active && <Check className="h-3.5 w-3.5" />}
                {f.label}
              </button>
            );
          })}
        </div>
      )}

      {/* 4) الوظيفة + عدد النقاط (بجانبها مثل زر الترتيب) */}
      <Row icon={Wand2} label="الوظيفة" iconColor="text-accent">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <select
              className={selBase}
              value={value.action}
              onChange={(e) => set({ action: e.target.value as ActionKey })}
            >
              {ACTION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute inset-y-0 left-3 my-auto h-4 w-4 text-ink-muted" />
          </div>
          {/* عدد النقاط — يُستخدم في كل الوظائف (حضور/إضافة/خصم) */}
          <div className="relative shrink-0">
            <input
              value={String(value.points)}
              onChange={(e) => {
                const clean = e.target.value.replace(/[^\d.]/g, "");
                set({ points: clean === "" ? 0 : Number(clean) });
              }}
              inputMode="decimal"
              dir="ltr"
              title="عدد النقاط"
              aria-label="عدد النقاط"
              className="h-11 w-16 rounded-lg border border-primary-soft bg-surface-muted text-center text-sm font-bold text-primary outline-none focus:border-primary"
            />
            <Coins className="pointer-events-none absolute -top-1.5 -left-1.5 h-4 w-4 rounded-full bg-surface p-0.5 text-amber-500 shadow-soft" />
          </div>
        </div>
      </Row>
    </div>
  );
}
