"use client";

/**
 * لوحة بروفايلات البطاقة:
 *  - اختيار بروفايل محفوظ (يطبّق ألوانه وإعداداته)
 *  - ألوان مخصصة (تدرّج الخلفية + لون الخط)
 *  - حفظ الإعدادات الحالية كبروفايل جديد (باسم وأيقونة)
 *  - حذف بروفايل
 *  - ربط كل فصل ببروفايل افتراضي (يُستخدم تلقائياً عند الطباعة)
 */

import { useState } from "react";
import { Check, Save, Trash2, X, Link2, Loader2, Contact } from "lucide-react";
import { CardProfileRow, CardTheme, PROFILE_ICONS } from "@/lib/print/types";
import { ClassRow, classDisplayName } from "@/lib/data/types";

export function ProfilesPanel({
  profiles,
  activeThemeId,
  customTheme,
  classes,
  onSelectProfile,
  onApplyCustom,
  onCustomChange,
  onSaveProfile,
  onDeleteProfile,
  onLinkClass,
  saving,
}: {
  profiles: CardProfileRow[];
  activeThemeId: string; // '__custom__' أو id بروفايل
  customTheme: CardTheme;
  classes: ClassRow[];
  onSelectProfile: (p: CardProfileRow) => void;
  onApplyCustom: () => void;
  onCustomChange: (patch: Partial<CardTheme>) => void;
  onSaveProfile: (name: string, icon: string) => Promise<boolean>;
  onDeleteProfile: (id: string) => void;
  onLinkClass: (classId: string, profileId: string | null) => void;
  saving: boolean;
}) {
  const [showSave, setShowSave] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState<string>(PROFILE_ICONS[0]);

  const activeName =
    activeThemeId === "__custom__"
      ? "مخصص"
      : profiles.find((p) => p.id === activeThemeId)?.name || "مخصص";

  const handleSave = async () => {
    if (!newName.trim()) return;
    const ok = await onSaveProfile(newName.trim(), newIcon);
    if (ok) {
      setNewName("");
      setShowSave(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <strong className="text-sm text-ink">🎨 بروفايلات البطاقة</strong>
        <span className="text-[11px] text-ink-muted">{activeName}</span>
      </div>

      {/* قائمة البروفايلات */}
      {profiles.length === 0 ? (
        <div className="rounded-lg bg-surface-muted p-4 text-center text-xs text-ink-muted">
          لا توجد بروفايلات محفوظة بعد
          <br />
          <span className="text-[10px]">اضبط إعداداتك ثم اضغط "حفظ كبروفايل جديد"</span>
        </div>
      ) : (
        <div className="flex max-h-48 flex-wrap justify-center gap-2.5 overflow-y-auto p-1">
          {profiles.map((p) => {
            const isActive = p.id === activeThemeId;
            return (
              <div key={p.id} className="relative flex flex-col items-center gap-1">
                <button
                  type="button"
                  title={p.name}
                  onClick={() => onSelectProfile(p)}
                  className={`grid h-11 w-11 place-items-center rounded-full text-sm shadow-soft transition ${
                    isActive ? "ring-2 ring-ink ring-offset-2" : ""
                  }`}
                  style={{
                    background: `linear-gradient(135deg,${p.bg_color1},${p.bg_color2})`,
                    color: p.text_color || "#fff",
                    border: p.bg_color1 === "#ffffff" ? "1.5px solid #cbd5e1" : "none",
                  }}
                >
                  <Contact className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="حذف"
                  onClick={() => onDeleteProfile(p.id)}
                  className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-red-500 text-[9px] text-white shadow"
                >
                  ✕
                </button>
                <span className="max-w-[56px] truncate text-center text-[9px] text-ink-muted">
                  {p.name}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ألوان مخصصة */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <label className="text-[11px] text-ink-muted">خلفية:</label>
        <input
          type="color"
          value={customTheme.c1}
          title="لون التدرج الأول"
          onChange={(e) => onCustomChange({ c1: e.target.value })}
          className="h-8 w-8 cursor-pointer rounded-lg border-0"
        />
        <input
          type="color"
          value={customTheme.c2}
          title="لون التدرج الثاني"
          onChange={(e) => onCustomChange({ c2: e.target.value })}
          className="h-8 w-8 cursor-pointer rounded-lg border-0"
        />
        <span className="h-6 w-px bg-border" />
        <label className="text-[11px] text-ink-muted">خط:</label>
        <input
          type="color"
          value={customTheme.text}
          title="لون النص"
          onChange={(e) => onCustomChange({ text: e.target.value })}
          className="h-8 w-8 cursor-pointer rounded-lg border-0"
        />
        <button
          type="button"
          onClick={onApplyCustom}
          className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-bold text-white"
        >
          <Check className="h-3 w-3" /> تطبيق
        </button>
      </div>

      {/* أزرار الحفظ والربط */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setShowSave((v) => !v)}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-white"
        >
          <Save className="h-3.5 w-3.5" /> حفظ كبروفايل جديد
        </button>
        <button
          type="button"
          onClick={() => setShowLink((v) => !v)}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-violet-500 px-3 py-2 text-xs font-bold text-white"
        >
          <Link2 className="h-3.5 w-3.5" /> ربط الفصول
        </button>
      </div>

      {/* نموذج حفظ بروفايل */}
      {showSave && (
        <div className="space-y-2 rounded-xl bg-surface-muted p-3">
          <p className="text-[11px] text-ink-muted">
            سيتم حفظ كل إعداداتك الحالية (الألوان، العناصر، وضع الطباعة...) في بروفايل واحد.
          </p>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="اسم البروفايل *"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-1.5">
            {PROFILE_ICONS.slice(0, 12).map((ic) => (
              <button
                key={ic}
                type="button"
                onClick={() => setNewIcon(ic)}
                className={`rounded-lg border-2 px-2 py-1 text-[10px] font-semibold transition ${
                  newIcon === ic
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border bg-surface text-ink-muted"
                }`}
              >
                {ic}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !newName.trim()}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              حفظ
            </button>
            <button
              type="button"
              onClick={() => setShowSave(false)}
              className="rounded-lg bg-surface px-3 py-2 text-xs font-bold text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ربط الفصول بالبروفايلات */}
      {showLink && (
        <div className="space-y-1.5 rounded-xl bg-surface-muted p-3">
          <p className="text-[11px] text-ink-muted">
            اربط كل فصل ببروفايل — يُستخدم تلقائياً عند طباعة بطاقات مخدومي الفصل.
          </p>
          {classes.map((c) => (
            <div key={c.id} className="flex items-center gap-2">
              <span className="flex-1 truncate text-xs font-semibold text-ink">
                {classDisplayName(c)}
              </span>
              <select
                value={c.default_card_profile_id || ""}
                onChange={(e) => onLinkClass(c.id, e.target.value || null)}
                className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs"
              >
                <option value="">— بدون —</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
          {classes.length === 0 && (
            <p className="text-center text-xs text-ink-muted">لا توجد فصول</p>
          )}
        </div>
      )}
    </div>
  );
}
