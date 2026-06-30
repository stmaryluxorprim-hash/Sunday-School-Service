"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ChevronRight,
  GraduationCap,
  Plus,
  Pencil,
  Trash2,
  Camera,
  Loader2,
  X,
  Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ClassRow, WEEK_DAYS, classDisplayName } from "@/lib/data/types";
import { ImageCropper } from "@/components/image/image-cropper";
import { uploadImage } from "@/lib/storage/upload";

type EditState = Partial<ClassRow> & { _new?: boolean };

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditState | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("classes")
      .select("*")
      .order("created_at", { ascending: true });
    setClasses((data as ClassRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const supabase = createClient();
    const channel = supabase
      .channel("classes_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "classes" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const handleDelete = async (c: ClassRow) => {
    if (!confirm(`حذف فصل «${classDisplayName(c)}»؟`)) return;
    const supabase = createClient();
    await supabase.from("classes").delete().eq("id", c.id);
    load();
  };

  return (
    <div>
      {/* header */}
      <div className="animate-fade-up mb-4 flex items-center gap-3">
        <Link
          href="/settings"
          className="grid h-10 w-10 place-items-center rounded-2xl bg-surface text-ink shadow-card active:scale-95"
        >
          <ChevronRight className="h-5 w-5" />
        </Link>
        <div className="flex flex-1 items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-ink">إدارة الفصول</h2>
        </div>
        <button
          onClick={() =>
            setEditing({
              _new: true,
              name: "",
              patron: "",
              stage: "",
              service_days: [],
              color_primary: "#6d5dfc",
              color_accent: "#f15bb5",
            })
          }
          className="grid h-10 w-10 place-items-center rounded-2xl btn-gradient text-white shadow-soft active:scale-95"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {loading ? (
        <div className="grid place-items-center py-16 text-ink-muted">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : classes.length === 0 ? (
        <div className="animate-fade-up rounded-3xl bg-surface p-8 text-center shadow-card border border-white/40">
          <GraduationCap className="mx-auto mb-2 h-10 w-10 text-primary" />
          <p className="text-sm font-semibold text-ink">لا توجد فصول بعد</p>
          <p className="mt-1 text-xs text-ink-muted">اضغط + لإضافة فصل</p>
        </div>
      ) : (
        <div className="space-y-3">
          {classes.map((c) => (
            <div
              key={c.id}
              className="animate-fade-up flex items-center gap-3 rounded-3xl bg-surface p-3 shadow-card border border-white/40"
            >
              <div
                className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl text-white shadow-soft"
                style={{
                  background: `linear-gradient(100deg, ${c.color_primary}, ${c.color_accent})`,
                }}
              >
                {c.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <GraduationCap className="h-6 w-6" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-ink">{classDisplayName(c)}</p>
                <p className="truncate text-xs text-ink-muted">
                  {c.patron ? `شفيع: ${c.patron}` : "—"}
                  {c.service_days.length > 0 && ` • ${c.service_days.join("، ")}`}
                </p>
              </div>
              <button
                onClick={() => setEditing({ ...c })}
                className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary active:scale-95"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDelete(c)}
                className="grid h-9 w-9 place-items-center rounded-xl bg-accent-soft text-accent active:scale-95"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <ClassEditor
          value={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function ClassEditor({
  value,
  onClose,
  onSaved,
}: {
  value: EditState;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(value.name ?? "");
  const [patron, setPatron] = useState(value.patron ?? "");
  const [stage, setStage] = useState(value.stage ?? "");
  const [days, setDays] = useState<string[]>(value.service_days ?? []);
  const [primary, setPrimary] = useState(value.color_primary ?? "#6d5dfc");
  const [accent, setAccent] = useState(value.color_accent ?? "#f15bb5");
  const [imageUrl, setImageUrl] = useState(value.image_url ?? null);
  const [imagePath, setImagePath] = useState(value.image_path ?? null);

  const [cropFile, setCropFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const toggleDay = (d: string) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const handleImage = async (blob: Blob) => {
    setCropFile(null);
    try {
      const { path, url } = await uploadImage(blob, "classes", imagePath);
      setImagePath(path);
      setImageUrl(url);
    } catch {
      alert("تعذّر رفع صورة الفصل.");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();
    const row = {
      name: name.trim(),
      patron: patron.trim() || null,
      stage: stage.trim() || null,
      service_days: days,
      color_primary: primary,
      color_accent: accent,
      image_path: imagePath,
      image_url: imageUrl,
    };
    try {
      if (value._new) {
        await supabase.from("classes").insert(row);
      } else if (value.id) {
        await supabase.from("classes").update(row).eq("id", value.id);
      }
      onSaved();
    } catch {
      alert("تعذّر حفظ الفصل.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-surface p-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] shadow-2xl sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-ink">
            {value._new ? "إضافة فصل" : "تعديل فصل"}
          </h3>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-xl bg-surface-muted text-ink active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* image */}
        <div className="mb-4 flex flex-col items-center gap-2">
          <button
            onClick={() => fileInput.current?.click()}
            className="relative grid h-20 w-20 place-items-center overflow-hidden rounded-2xl text-white shadow-soft active:scale-95"
            style={{ background: `linear-gradient(100deg, ${primary}, ${accent})` }}
          >
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Camera className="h-6 w-6" />
            )}
          </button>
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

        <div className="space-y-3">
          <LabeledInput label="اسم الفصل (اختياري — يُستخدم المرحلة لو فاضي)" value={name} onChange={setName} />
          <LabeledInput label="شفيع الفصل" value={patron} onChange={setPatron} />
          <LabeledInput label="مرحلة الفصل" value={stage} onChange={setStage} />

          {/* service days */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-muted">أيام الخدمة</label>
            <div className="flex flex-wrap gap-2">
              {WEEK_DAYS.map((d) => {
                const active = days.includes(d);
                return (
                  <button
                    key={d}
                    onClick={() => toggleDay(d)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
                      active ? "btn-gradient text-white" : "bg-surface-muted text-ink-muted"
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          {/* colors */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-muted">باليتة ألوان الفصل</label>
            <div
              className="mb-2 h-10 rounded-xl"
              style={{ background: `linear-gradient(100deg, ${primary}, ${accent})` }}
            />
            <div className="grid grid-cols-2 gap-2">
              <ColorMini value={primary} onChange={setPrimary} />
              <ColorMini value={accent} onChange={setAccent} />
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl btn-gradient py-3 text-sm font-bold text-white shadow-soft active:scale-95 disabled:opacity-70"
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
          {saving ? "جارٍ الحفظ..." : "حفظ"}
        </button>
      </div>

      {cropFile && (
        <ImageCropper
          file={cropFile}
          shape="square"
          outputSize={512}
          onCancel={() => setCropFile(null)}
          onConfirm={handleImage}
        />
      )}
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-ink-muted">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-primary-soft bg-surface-muted px-4 py-2.5 text-ink outline-none focus:border-primary"
      />
    </div>
  );
}

function ColorMini({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-surface-muted p-2">
      <label className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-lg ring-1 ring-black/5">
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
        dir="ltr"
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-primary-soft bg-surface px-2 py-1.5 text-xs text-ink outline-none focus:border-primary"
      />
    </div>
  );
}
