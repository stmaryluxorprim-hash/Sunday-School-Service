"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Palette,
  Camera,
  Loader2,
  Check,
  Church,
} from "lucide-react";
import { useSettings } from "@/context/settings-context";
import { ImageCropper } from "@/components/image/image-cropper";
import { uploadImage } from "@/lib/storage/upload";

export default function IdentityPage() {
  const { branding, setLocal, save } = useSettings();

  const [name, setName] = useState(branding.serviceName);
  const [slogan, setSlogan] = useState(branding.slogan);
  const [primary, setPrimary] = useState(branding.colorPrimary);
  const [accent, setAccent] = useState(branding.colorAccent);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [cropFile, setCropFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // live preview of gradient while picking colors
  const previewLocal = (p: Partial<typeof branding>) => setLocal(p);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await save({
        serviceName: name.trim() || "خدمة الكنيسة",
        slogan: slogan.trim(),
        colorPrimary: primary,
        colorAccent: accent,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoConfirm = async (blob: Blob) => {
    setCropFile(null);
    setUploadingLogo(true);
    try {
      const { path, url } = await uploadImage(blob, "branding", branding.logoPath);
      await save({ logoPath: path, logoUrl: url });
    } catch (e) {
      console.error(e);
      alert("تعذّر رفع الصورة. تأكد من إعداد التخزين في Supabase.");
    } finally {
      setUploadingLogo(false);
    }
  };

  return (
    <div>
      {/* Sub-page header */}
      <div className="animate-fade-up mb-4 flex items-center gap-3">
        <Link
          href="/settings"
          className="grid h-10 w-10 place-items-center rounded-2xl bg-surface text-ink shadow-card active:scale-95"
        >
          <ChevronRight className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-ink">الهوية</h2>
        </div>
      </div>

      {/* Logo */}
      <div className="animate-fade-up mb-3 rounded-3xl bg-surface p-5 shadow-card border border-white/40">
        <p className="mb-3 text-sm font-bold text-ink">لوجو الخدمة</p>
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => fileInput.current?.click()}
            className="relative grid h-24 w-24 place-items-center overflow-hidden rounded-full btn-gradient shadow-soft active:scale-95"
          >
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logoUrl} alt="logo" className="h-full w-full object-cover" />
            ) : (
              <Church className="h-10 w-10 text-white" />
            )}
            <span className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-1 bg-black/40 py-1 text-[10px] font-semibold text-white">
              {uploadingLogo ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Camera className="h-3 w-3" />
              )}
              تغيير
            </span>
          </button>
          <p className="text-xs text-ink-muted">يتم قص الصورة وضغطها تلقائياً قبل الرفع</p>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setCropFile(f);
            e.target.value = "";
          }}
        />
      </div>

      {/* Name + slogan */}
      <div className="animate-fade-up mb-3 space-y-3 rounded-3xl bg-surface p-5 shadow-card border border-white/40">
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-muted">اسم الخدمة</label>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              previewLocal({ serviceName: e.target.value });
            }}
            className="w-full rounded-2xl border border-primary-soft bg-surface-muted px-4 py-2.5 text-ink outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-muted">الشعار</label>
          <input
            value={slogan}
            onChange={(e) => {
              setSlogan(e.target.value);
              previewLocal({ slogan: e.target.value });
            }}
            className="w-full rounded-2xl border border-primary-soft bg-surface-muted px-4 py-2.5 text-ink outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Colors (gradient = two colors) */}
      <div className="animate-fade-up mb-3 rounded-3xl bg-surface p-5 shadow-card border border-white/40">
        <p className="mb-3 text-sm font-bold text-ink">ألوان النظام (التدرج اللوني)</p>

        {/* Gradient preview */}
        <div
          className="mb-4 h-16 rounded-2xl shadow-inner"
          style={{ background: `linear-gradient(100deg, ${primary}, ${accent})` }}
        />

        <div className="grid grid-cols-2 gap-3">
          <ColorBox
            label="اللون الأول"
            value={primary}
            onChange={(v) => {
              setPrimary(v);
              previewLocal({ colorPrimary: v });
            }}
          />
          <ColorBox
            label="اللون الثاني"
            value={accent}
            onChange={(v) => {
              setAccent(v);
              previewLocal({ colorAccent: v });
            }}
          />
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex w-full items-center justify-center gap-2 rounded-2xl btn-gradient py-3.5 text-sm font-bold text-white shadow-soft transition active:scale-95 disabled:opacity-70"
      >
        {saving ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : saved ? (
          <Check className="h-5 w-5" />
        ) : null}
        {saving ? "جارٍ الحفظ..." : saved ? "تم الحفظ" : "حفظ التغييرات"}
      </button>

      {cropFile && (
        <ImageCropper
          file={cropFile}
          shape="circle"
          outputSize={512}
          onCancel={() => setCropFile(null)}
          onConfirm={handleLogoConfirm}
        />
      )}
    </div>
  );
}

function ColorBox({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="rounded-2xl bg-surface-muted p-3">
      <label className="mb-2 block text-xs font-semibold text-ink-muted">{label}</label>
      <div className="flex items-center gap-2">
        <label className="relative h-12 w-12 shrink-0 cursor-pointer overflow-hidden rounded-xl shadow-card ring-1 ring-black/5">
          <span className="block h-full w-full" style={{ background: value }} />
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          dir="ltr"
          className="w-full rounded-xl border border-primary-soft bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary"
        />
      </div>
    </div>
  );
}
