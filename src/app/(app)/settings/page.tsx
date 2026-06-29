"use client";

import { Settings as SettingsIcon, Moon, Sun, RotateCcw, Palette } from "lucide-react";
import { PageHero, Card } from "@/components/ui/page-card";
import { useSettings } from "@/context/settings-context";
import { THEME_PRESETS } from "@/config/app-config";

export default function SettingsPage() {
  const { branding, updateBranding, resetBranding } = useSettings();

  return (
    <div>
      <PageHero title="الإعدادات" subtitle="تخصيص التطبيق والمظهر" icon={SettingsIcon} />

      {/* Branding */}
      <Card className="mb-3 space-y-3">
        <h3 className="font-bold text-ink">الهوية</h3>

        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-muted">اسم الخدمة</label>
          <input
            value={branding.serviceName}
            onChange={(e) => updateBranding({ serviceName: e.target.value })}
            className="w-full rounded-2xl border border-primary-soft bg-surface-muted px-4 py-2.5 text-ink outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-muted">الشعار</label>
          <input
            value={branding.slogan}
            onChange={(e) => updateBranding({ slogan: e.target.value })}
            className="w-full rounded-2xl border border-primary-soft bg-surface-muted px-4 py-2.5 text-ink outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-muted">
            رابط الأيقونة (اختياري)
          </label>
          <input
            value={branding.iconUrl ?? ""}
            placeholder="https://..."
            onChange={(e) => updateBranding({ iconUrl: e.target.value || null })}
            className="w-full rounded-2xl border border-primary-soft bg-surface-muted px-4 py-2.5 text-ink outline-none focus:border-primary"
            dir="ltr"
          />
        </div>
      </Card>

      {/* Theme presets */}
      <Card className="mb-3">
        <h3 className="mb-3 flex items-center gap-2 font-bold text-ink">
          <Palette className="h-4 w-4 text-primary" /> نظام الألوان
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {THEME_PRESETS.map((preset) => {
            const active = branding.themeId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => updateBranding({ themeId: preset.id })}
                className={`flex items-center gap-2 rounded-2xl border-2 p-3 transition active:scale-95 ${
                  active ? "border-primary bg-primary-soft/40" : "border-transparent bg-surface-muted"
                }`}
              >
                <span className="flex">
                  <span
                    className="h-5 w-5 rounded-full"
                    style={{ background: `rgb(${preset.primary})` }}
                  />
                  <span
                    className="-ms-2 h-5 w-5 rounded-full"
                    style={{ background: `rgb(${preset.accent})` }}
                  />
                </span>
                <span className="text-sm font-semibold text-ink">{preset.name}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Dark mode */}
      <Card className="mb-3">
        <button
          onClick={() => updateBranding({ darkMode: !branding.darkMode })}
          className="flex w-full items-center justify-between"
        >
          <span className="flex items-center gap-2 font-semibold text-ink">
            {branding.darkMode ? (
              <Moon className="h-5 w-5 text-primary" />
            ) : (
              <Sun className="h-5 w-5 text-accent" />
            )}
            الوضع الليلي
          </span>
          <span
            className={`relative h-7 w-12 rounded-full transition ${
              branding.darkMode ? "bg-primary" : "bg-surface-muted"
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
                branding.darkMode ? "left-1" : "left-6"
              }`}
            />
          </span>
        </button>
      </Card>

      {/* RBAC placeholder */}
      <Card className="mb-3">
        <h3 className="mb-1 font-bold text-ink">الصلاحيات والملفات الشخصية</h3>
        <p className="text-sm text-ink-muted">
          إدارة الأدوار (RBAC) والملفات الشخصية ستُضاف في خطوة قادمة، مع التحكم في
          صلاحية كل تفصيلة داخل التطبيق.
        </p>
      </Card>

      <button
        onClick={resetBranding}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent-soft py-3 text-sm font-bold text-accent active:scale-95 transition"
      >
        <RotateCcw className="h-4 w-4" />
        إعادة الضبط للافتراضي
      </button>
    </div>
  );
}
