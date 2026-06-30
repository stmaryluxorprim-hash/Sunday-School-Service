"use client";

import { useState, useRef } from "react";
import { Camera, Loader2, Check, Church } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSettings } from "@/context/settings-context";
import {
  generateMemberCode,
  isValidPhone,
  normalizePhone,
  phoneForStorage,
  joinNameParts,
  partsToISO,
  Gender,
} from "@/lib/data/types";
import { DobSelect, DOB } from "@/components/ui/dob-select";
import { ImageCropper } from "@/components/image/image-cropper";
import { uploadImage } from "@/lib/storage/upload";
import { PhoneField } from "./phone-field";

type ClassOpt = { id: string; name: string };

export function AddSingle({ classes }: { classes: ClassOpt[] }) {
  const { branding } = useSettings();

  // UI keeps 4 name parts + day/month/year — storage is a single name + birth_date
  const [names, setNames] = useState(["", "", "", ""]);
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState<DOB>({ day: null, month: null, year: null });
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [balance, setBalance] = useState("");
  const [gender, setGender] = useState<Gender>("male");
  const [classId, setClassId] = useState<string>("");

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const setName = (i: number, v: string) =>
    setNames((prev) => prev.map((n, idx) => (idx === i ? v : n)));

  const handlePhoto = async (blob: Blob) => {
    setCropFile(null);
    try {
      const { path, url } = await uploadImage(blob, "members", photoPath);
      setPhotoPath(path);
      setPhotoUrl(url);
    } catch {
      setError("تعذّر رفع الصورة.");
    }
  };

  const reset = () => {
    setNames(["", "", "", ""]);
    setPhone("");
    setDob({ day: null, month: null, year: null });
    setAddress("");
    setNotes("");
    setBalance("");
    setGender("male");
    setClassId("");
    setPhotoUrl(null);
    setPhotoPath(null);
  };

  const handleSave = async () => {
    setError(null);
    if (!names[0].trim()) {
      setError("الاسم الأول مطلوب.");
      return;
    }
    // phone is optional, but if entered it must normalize to a valid 11-digit
    if (phone && !isValidPhone(normalizePhone(phone))) {
      setError("رقم التليفون يجب أن يكون 11 رقماً يبدأ بـ 0 (أو 10 أرقام بدون الصفر).");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const row = {
      code: generateMemberCode(branding.codeWord),
      name: joinNameParts(names),                 // single stored name
      phone: phone ? phoneForStorage(phone) : null, // stored as +2 + 11 digits
      birth_date: partsToISO(dob.day, dob.month, dob.year), // single stored date
      address: address.trim() || null,
      notes: notes.trim() || null,
      photo_path: photoPath,
      photo_url: photoUrl,
      opening_balance: balance ? parseFloat(balance) : 0,
      gender,
      class_id: classId || null,
    };
    try {
      const { error: err } = await supabase.from("members").insert(row);
      if (err) throw err;
      setDone(true);
      reset();
      setTimeout(() => setDone(false), 2500);
    } catch {
      setError("تعذّر حفظ المخدوم.");
    } finally {
      setSaving(false);
    }
  };

  const input =
    "w-full rounded-2xl border border-primary-soft bg-surface-muted px-4 py-2.5 text-ink outline-none focus:border-primary";

  return (
    <div className="space-y-3">
      {/* photo */}
      <div className="animate-fade-up flex flex-col items-center gap-2 rounded-3xl bg-surface p-4 shadow-card border border-white/40">
        <button
          onClick={() => fileInput.current?.click()}
          className="relative grid h-24 w-24 place-items-center overflow-hidden rounded-full btn-gradient shadow-soft active:scale-95"
        >
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Church className="h-9 w-9 text-white" />
          )}
          <span className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-1 bg-black/40 py-1 text-[10px] font-semibold text-white">
            <Camera className="h-3 w-3" /> صورة
          </span>
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setCropFile(f);
            e.target.value = "";
          }}
        />
        <p className="text-[11px] text-ink-muted">من المعرض أو الكاميرا — يتم القص والضغط تلقائياً</p>
      </div>

      {/* names — 4 input boxes (UI), joined into one stored name */}
      <div className="animate-fade-up rounded-3xl bg-surface p-4 shadow-card border border-white/40">
        <label className="mb-2 block text-xs font-semibold text-ink-muted">الاسم رباعي</label>
        <div className="grid grid-cols-2 gap-2">
          {["الاسم الأول", "اسم الأب", "اسم الجد", "اسم العائلة"].map((ph, i) => (
            <input
              key={i}
              value={names[i]}
              onChange={(e) => setName(i, e.target.value)}
              placeholder={ph}
              className={input}
            />
          ))}
        </div>
      </div>

      {/* contact + details */}
      <div className="animate-fade-up space-y-3 rounded-3xl bg-surface p-4 shadow-card border border-white/40">
        <PhoneField value={phone} onChange={setPhone} />
        <DobSelect value={dob} onChange={setDob} />
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-muted">العنوان</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} className={input} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-muted">ملاحظات</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={input + " resize-none"}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-muted">الرصيد الافتتاحي</label>
          <input
            value={balance}
            onChange={(e) => setBalance(e.target.value.replace(/[^\d.]/g, ""))}
            inputMode="decimal"
            dir="ltr"
            className={input}
            placeholder="0"
          />
        </div>
      </div>

      {/* gender + class */}
      <div className="animate-fade-up space-y-3 rounded-3xl bg-surface p-4 shadow-card border border-white/40">
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-muted">النوع</label>
          <div className="flex gap-2">
            {(["male", "female"] as Gender[]).map((g) => (
              <button
                key={g}
                onClick={() => setGender(g)}
                className={`flex-1 rounded-2xl py-2.5 text-sm font-semibold transition active:scale-95 ${
                  gender === g ? "btn-gradient text-white" : "bg-surface-muted text-ink-muted"
                }`}
              >
                {g === "male" ? "ذكر" : "أنثى"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-muted">الفصل</label>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className={input}
          >
            <option value="">بدون فصل</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-accent-soft px-4 py-2.5 text-sm font-semibold text-accent">
          {error}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex w-full items-center justify-center gap-2 rounded-2xl btn-gradient py-3.5 text-sm font-bold text-white shadow-soft active:scale-95 disabled:opacity-70"
      >
        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : done ? <Check className="h-5 w-5" /> : null}
        {saving ? "جارٍ الحفظ..." : done ? "تمت الإضافة" : "إضافة المخدوم"}
      </button>

      {cropFile && (
        <ImageCropper
          file={cropFile}
          shape="circle"
          outputSize={512}
          onCancel={() => setCropFile(null)}
          onConfirm={handlePhoto}
        />
      )}
    </div>
  );
}
