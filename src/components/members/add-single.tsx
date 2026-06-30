"use client";

import { useState, useRef } from "react";
import { Camera, Loader2, Check, Church } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSettings } from "@/context/settings-context";
import {
  generateMemberCode,
  isValidPhone,
  Gender,
  splitName,
  parseDateString,
} from "@/lib/data/types";
import { ImageCropper } from "@/components/image/image-cropper";
import { uploadImage } from "@/lib/storage/upload";
import { PhoneField } from "./phone-field";

type ClassOpt = { id: string; name: string };

export function AddSingle({ classes }: { classes: ClassOpt[] }) {
  const { branding } = useSettings();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState(""); // single input (ISO YYYY-MM-DD)
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
    setFullName("");
    setPhone("");
    setBirthDate("");
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
    if (!fullName.trim()) {
      setError("الاسم مطلوب.");
      return;
    }
    if (phone && !isValidPhone(phone)) {
      setError("رقم التليفون يجب أن يكون 11 رقماً ويبدأ بـ 0.");
      return;
    }
    // split full name -> stored parts (storage stays split, input is one field)
    const [n1, n2, n3, n4] = splitName(fullName);
    const dob = parseDateString(birthDate);
    setSaving(true);
    const supabase = createClient();
    const row = {
      code: generateMemberCode(branding.codeWord),
      name1: n1,
      name2: n2,
      name3: n3,
      name4: n4,
      phone: phone || null,
      birth_day: dob.day,
      birth_month: dob.month,
      birth_year: dob.year,
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

      {/* name (single field, auto-split on save) */}
      <div className="animate-fade-up rounded-3xl bg-surface p-4 shadow-card border border-white/40">
        <label className="mb-2 block text-xs font-semibold text-ink-muted">
          الاسم رباعي
        </label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="مثال: كيفين بيشوى اسعد فهمي"
          className={input}
        />
        <p className="mt-1 text-[11px] text-ink-muted">
          اكتب الاسم كاملاً بمسافات — يُقسَّم تلقائياً عند الحفظ.
        </p>
      </div>

      {/* contact + details */}
      <div className="animate-fade-up space-y-3 rounded-3xl bg-surface p-4 shadow-card border border-white/40">
        <PhoneField value={phone} onChange={setPhone} />
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-muted">
            تاريخ الميلاد
          </label>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            dir="ltr"
            className={input}
          />
        </div>
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
