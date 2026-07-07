"use client";

/** مودال إضافة/تعديل صنف — الاسم + الصورة + السعر بالنقاط + الكمية. */

import { useState } from "react";
import { X, Check, Loader2, ImagePlus, Gift } from "lucide-react";
import { ImageCropper } from "@/components/image/image-cropper";
import { uploadImage } from "@/lib/storage/upload";
import { StoreItemRow, generateItemCode } from "@/lib/store/types";
import { createItem, updateItem } from "@/lib/store/operations";

export function ItemEditor({
  item,
  onClose,
  onSaved,
}: {
  /** null = صنف جديد */
  item: StoreItemRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [price, setPrice] = useState(item ? String(item.points_price) : "");
  const [stock, setStock] = useState(item ? String(item.stock) : "");
  const [isActive, setIsActive] = useState(item?.is_active ?? true);
  const [photoUrl, setPhotoUrl] = useState<string | null>(item?.photo_url ?? null);
  const [photoPath, setPhotoPath] = useState<string | null>(item?.photo_path ?? null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePhoto = async (blob: Blob) => {
    setCropFile(null);
    try {
      const { path, url } = await uploadImage(blob, "store", photoPath);
      setPhotoPath(path);
      setPhotoUrl(url);
    } catch {
      setError("تعذّر رفع الصورة.");
    }
  };

  const save = async () => {
    setError(null);
    if (!name.trim()) {
      setError("اسم الهدية مطلوب.");
      return;
    }
    const p = Number(price);
    if (!Number.isFinite(p) || p < 0) {
      setError("أدخل سعراً صحيحاً بالنقاط.");
      return;
    }
    const s = Math.max(0, Math.floor(Number(stock) || 0));
    setSaving(true);
    const payload = {
      name: name.trim(),
      points_price: p,
      stock: s,
      photo_path: photoPath,
      photo_url: photoUrl,
      is_active: isActive,
    };
    const res = item
      ? await updateItem(item.id, payload)
      : await createItem({ ...payload, code: generateItemCode() });
    setSaving(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-surface p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold text-ink">{item ? "تعديل الصنف" : "هدية جديدة"}</h3>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg bg-surface-muted text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* الصورة */}
        <div className="mb-4 flex justify-center">
          <label className="group relative cursor-pointer">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setCropFile(f);
                e.target.value = "";
              }}
            />
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt=""
                className="h-28 w-28 rounded-2xl object-cover shadow-soft"
              />
            ) : (
              <div className="grid h-28 w-28 place-items-center rounded-2xl bg-surface-muted text-ink-muted">
                <Gift className="h-10 w-10" />
              </div>
            )}
            <span className="absolute -bottom-1 -left-1 grid h-8 w-8 place-items-center rounded-full grad-green text-white shadow-soft">
              <ImagePlus className="h-4 w-4" />
            </span>
          </label>
        </div>

        <label className="mb-1 block text-xs font-bold text-ink-muted">اسم الهدية *</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="مثال: لعبة مكعبات"
          className="mb-3 w-full rounded-xl border border-white/40 bg-surface-muted px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/40"
        />

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-bold text-ink-muted">
              السعر (نقاط) *
            </label>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
              dir="ltr"
              placeholder="0"
              className="w-full rounded-xl border border-white/40 bg-surface-muted px-3 py-2.5 text-center text-sm font-bold text-ink outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-ink-muted">الكمية</label>
            <input
              value={stock}
              onChange={(e) => setStock(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              dir="ltr"
              placeholder="0"
              className="w-full rounded-xl border border-white/40 bg-surface-muted px-3 py-2.5 text-center text-sm font-bold text-ink outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        <label className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 accent-[var(--c-primary,#6366f1)]"
          />
          الصنف متاح للبيع
        </label>

        {item && (
          <p className="mb-3 rounded-xl bg-surface-muted px-3 py-2 text-[11px] text-ink-muted" dir="ltr">
            {item.code}
          </p>
        )}

        {error && (
          <div className="mb-3 rounded-2xl bg-accent-soft px-4 py-2.5 text-sm font-semibold text-accent">
            {error}
          </div>
        )}

        <button
          onClick={save}
          disabled={saving || !name.trim()}
          className="btn-gradient flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold shadow-soft active:scale-95 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          حفظ
        </button>
      </div>

      {cropFile && (
        <ImageCropper
          file={cropFile}
          shape="square"
          outputSize={512}
          onCancel={() => setCropFile(null)}
          onConfirm={handlePhoto}
        />
      )}
    </div>
  );
}
