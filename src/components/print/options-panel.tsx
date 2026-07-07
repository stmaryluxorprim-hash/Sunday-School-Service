"use client";

/**
 * لوحة خيارات الطباعة — حجم البطاقة، وضع الطباعة (وش/وش+ظهر/ظهر)،
 * عناصر الوش والظهر، اللوجو بدل الصورة، المساحة الآمنة للقص،
 * وألوان الهيدر/الفوتر المتقدمة — كل تغيير يُحفظ ويُحدّث المعاينة فوراً.
 */

import {
  Square,
  Copy,
  RotateCcw,
  Contact,
  FileText,
  Crop,
  Image as ImageIcon,
} from "lucide-react";
import { CardPrintOptions, CardSize, PrintMode } from "@/lib/print/types";

type Props = {
  opts: CardPrintOptions;
  onChange: (patch: Partial<CardPrintOptions>) => void;
  onReset: () => void;
};

function ModeBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-lg border-2 px-2 py-2.5 text-[11px] font-bold transition ${
        active
          ? "border-primary bg-primary text-white shadow-soft"
          : "border-border bg-surface text-ink"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function CheckOpt({
  checked,
  onChange,
  label,
  className = "",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  className?: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-2 rounded-lg bg-surface px-2.5 py-2 text-xs font-semibold text-ink ${className}`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[--tw-color-primary]"
      />
      {label}
    </label>
  );
}

function BandColor({
  label,
  enabled,
  bg,
  text,
  onToggle,
  onBg,
  onText,
}: {
  label: string;
  enabled: boolean;
  bg: string;
  text: string;
  onToggle: (v: boolean) => void;
  onBg: (v: string) => void;
  onText: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-surface px-2.5 py-2">
      <label className="flex flex-1 cursor-pointer items-center gap-2 text-xs font-semibold text-ink">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="h-4 w-4"
        />
        {label}
      </label>
      <input
        type="color"
        value={bg || "#1e293b"}
        onChange={(e) => onBg(e.target.value)}
        title="لون الخلفية"
        className="h-8 w-8 cursor-pointer rounded-md border-0"
      />
      <input
        type="color"
        value={text || "#ffffff"}
        onChange={(e) => onText(e.target.value)}
        title="لون النص"
        className="h-8 w-8 cursor-pointer rounded-md border-0"
      />
    </div>
  );
}

export function OptionsPanel({ opts, onChange, onReset }: Props) {
  const isBack = opts.mode === "back";
  const isFront = opts.mode === "front";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <strong className="text-sm text-ink">⚙️ خيارات الطباعة</strong>
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1 rounded-lg bg-surface-muted px-2.5 py-1 text-[10px] font-bold text-ink"
        >
          <RotateCcw className="h-3 w-3" /> افتراضي
        </button>
      </div>

      {/* حجم البطاقة */}
      <div>
        <div className="mb-1.5 text-[11px] font-bold text-ink-muted">حجم البطاقة:</div>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { v: "A6", label: "A6 (105×74مم)", icon: <FileText className="h-4 w-4" /> },
              { v: "CR80", label: "CR80 (86×54مم)", icon: <Contact className="h-4 w-4" /> },
            ] as { v: CardSize; label: string; icon: React.ReactNode }[]
          ).map(({ v, label, icon }) => (
            <ModeBtn
              key={v}
              active={opts.cardSize === v}
              onClick={() => onChange({ cardSize: v })}
              icon={icon}
              label={label}
            />
          ))}
        </div>
      </div>

      {/* وضع الطباعة */}
      <div>
        <div className="mb-1.5 text-[11px] font-bold text-ink-muted">وضع الطباعة:</div>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { v: "front", label: "وش فقط", icon: <Square className="h-4 w-4 text-sky-500" /> },
              { v: "both", label: "وش+ظهر", icon: <Copy className="h-4 w-4 text-emerald-500" /> },
              { v: "back", label: "ظهر فقط", icon: <Contact className="h-4 w-4 text-violet-500" /> },
            ] as { v: PrintMode; label: string; icon: React.ReactNode }[]
          ).map(({ v, label, icon }) => (
            <ModeBtn
              key={v}
              active={opts.mode === v}
              onClick={() => onChange({ mode: v })}
              icon={icon}
              label={label}
            />
          ))}
        </div>
      </div>

      {/* عناصر الوش */}
      <div
        className={`transition ${isBack ? "pointer-events-none opacity-45" : ""}`}
      >
        <div className="mb-1.5 text-[11px] font-bold text-ink-muted">عناصر الوش:</div>
        <div className="grid grid-cols-2 gap-1.5">
          <CheckOpt checked={opts.frontHeader} onChange={(v) => onChange({ frontHeader: v })} label="الهيدر (اسم الخدمة)" />
          <CheckOpt checked={opts.frontName} onChange={(v) => onChange({ frontName: v })} label="اسم المخدوم" />
          <CheckOpt checked={opts.frontQR} onChange={(v) => onChange({ frontQR: v })} label="كود QR" />
          <CheckOpt checked={opts.frontPhoto} onChange={(v) => onChange({ frontPhoto: v })} label="صورة المخدوم" />
          <CheckOpt checked={opts.frontFooter} onChange={(v) => onChange({ frontFooter: v })} label="الفوتر (الفصل)" />
          <CheckOpt checked={opts.frontId} onChange={(v) => onChange({ frontId: v })} label="كود المخدوم" />
          <label className="col-span-2 flex cursor-pointer items-center gap-2 rounded-lg bg-amber-50 px-2.5 py-2 text-xs font-semibold text-amber-800">
            <input
              type="checkbox"
              checked={opts.useLogoInsteadOfPhoto}
              onChange={(e) => onChange({ useLogoInsteadOfPhoto: e.target.checked })}
              className="h-4 w-4"
            />
            <ImageIcon className="h-3.5 w-3.5 text-amber-600" />
            وضع اللوجو بدل صورة المخدوم
          </label>
        </div>
      </div>

      {/* المساحة الآمنة للقص */}
      <div className="rounded-lg border border-dashed border-blue-300 bg-blue-50/60 p-3">
        <div className="mb-1.5 flex items-center justify-between">
          <label className="flex items-center gap-1 text-xs font-bold text-blue-800">
            <Crop className="h-3.5 w-3.5" /> المساحة الآمنة للقص
            <span className="rounded-full bg-white px-1.5 py-0.5 text-[9px] font-semibold text-blue-600">
              مستقلة عن البروفايل
            </span>
          </label>
          <span className="text-[11px] font-bold text-blue-800">{opts.safeMargin} مم</span>
        </div>
        <input
          type="range"
          min={2}
          max={10}
          step={0.5}
          value={opts.safeMargin}
          onChange={(e) => onChange({ safeMargin: parseFloat(e.target.value) })}
          className="w-full accent-blue-500"
        />
        <div className="mt-0.5 flex justify-between text-[9px] text-slate-500">
          <span>2مم</span>
          <span>4مم (موصى به)</span>
          <span>10مم</span>
        </div>
      </div>

      {/* عناصر الظهر */}
      <div className={`transition ${isFront ? "pointer-events-none opacity-45" : ""}`}>
        <div className="mb-1.5 text-[11px] font-bold text-ink-muted">عناصر الظهر:</div>
        <div className="grid grid-cols-2 gap-1.5">
          <CheckOpt checked={opts.backLogo} onChange={(v) => onChange({ backLogo: v })} label="لوجو الخدمة" />
          <CheckOpt checked={opts.backServiceName} onChange={(v) => onChange({ backServiceName: v })} label="اسم الخدمة" />
        </div>
      </div>

      {/* ألوان الهيدر والفوتر (متقدم) */}
      <div>
        <div className="mb-1.5 text-[11px] font-bold text-ink-muted">
          🎨 ألوان الهيدر والفوتر (متقدم):
        </div>
        <div className="space-y-1.5">
          <BandColor
            label="خلفية الهيدر"
            enabled={!!opts.headerColor}
            bg={opts.headerColor}
            text={opts.headerTextColor}
            onToggle={(v) => onChange({ headerColor: v ? "#1e293b" : "" })}
            onBg={(v) => onChange({ headerColor: v })}
            onText={(v) => onChange({ headerTextColor: v })}
          />
          <BandColor
            label="خلفية الفوتر"
            enabled={!!opts.footerColor}
            bg={opts.footerColor}
            text={opts.footerTextColor}
            onToggle={(v) => onChange({ footerColor: v ? "#1e293b" : "" })}
            onBg={(v) => onChange({ footerColor: v })}
            onText={(v) => onChange({ footerTextColor: v })}
          />
        </div>
        <p className="mt-1.5 text-center text-[10px] text-ink-muted">
          فعّل الخيار لاستخدام لون مخصص، غير ذلك يُستخدم اللون التلقائي
        </p>
      </div>
    </div>
  );
}
