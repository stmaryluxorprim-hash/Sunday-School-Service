"use client";

/**
 * أوراق (Sheets) وظائف المخدوم في صفحة البيانات:
 *  - MemberQrSheet:      إظهار QR Code لكود المخدوم (مع تنزيله كصورة).
 *  - MemberDetailsSheet: إظهار بيانات المخدوم وتعديلها وحفظها.
 *  - MemberDeleteSheet:  تأكيد إلغاء (حذف) المخدوم نهائياً.
 */

import { useEffect, useState } from "react";
import {
  X,
  Download,
  Loader2,
  Save,
  Trash2,
  AlertTriangle,
  User,
} from "lucide-react";
import QRCode from "qrcode";
import {
  MemberRow,
  ClassRow,
  classDisplayName,
  Gender,
  splitNameParts,
  joinNameParts,
  isoToParts,
  partsToISO,
  normalizePhone,
  isValidPhone,
  phoneForStorage,
} from "@/lib/data/types";
import { updateMember, deleteMember, OpResult } from "@/lib/data/operations";
import { DobSelect, DOB } from "@/components/ui/dob-select";
import { PhoneField } from "./phone-field";

/* ------------------------------------------------------------------ */
/*  غلاف عام للورقة السفلية (bottom sheet)                              */
/* ------------------------------------------------------------------ */
function Sheet({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-50 lg:inset-0 lg:grid lg:place-items-center">
        <div className="mx-auto flex max-h-[88vh] w-full max-w-md flex-col rounded-t-xl bg-surface shadow-2xl lg:max-h-[85vh] lg:rounded-xl">
          <div className="card-topline flex items-center justify-between gap-2 rounded-t-xl p-4 pb-3">
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold text-ink">{title}</h3>
              {subtitle && (
                <p className="truncate text-xs text-ink-muted" dir="ltr">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-muted text-ink active:scale-95"
              aria-label="إغلاق"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="overflow-y-auto p-4 pt-1 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  1) إظهار QR Code للمخدوم                                            */
/* ------------------------------------------------------------------ */
export function MemberQrSheet({
  member,
  onClose,
}: {
  member: MemberRow | null;
  onClose: () => void;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!member) {
      setDataUrl(null);
      return;
    }
    QRCode.toDataURL(member.code, {
      width: 480,
      margin: 2,
      errorCorrectionLevel: "M",
    })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [member]);

  if (!member) return null;

  const download = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `qr_${member.code}.png`;
    a.click();
  };

  return (
    <Sheet
      title={`QR Code — ${member.name || "—"}`}
      subtitle={member.code}
      onClose={onClose}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="grid place-items-center rounded-xl border-2 border-primary-soft bg-white p-3">
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dataUrl} alt="QR" className="h-56 w-56" />
          ) : (
            <div className="grid h-56 w-56 place-items-center text-ink-muted">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
        </div>
        <p className="text-center text-xs text-ink-muted">
          امسح هذا الكود من صفحة الماسح لتسجيل الحضور أو النقاط
        </p>
        <button
          onClick={download}
          disabled={!dataUrl}
          className="flex w-full items-center justify-center gap-2 rounded-lg grad-violet py-3 text-sm font-bold text-white shadow-soft active:scale-95 disabled:opacity-50"
        >
          <Download className="h-5 w-5" /> تنزيل الصورة
        </button>
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/*  2) بيانات المخدوم — عرض وتعديل                                       */
/* ------------------------------------------------------------------ */
export function MemberDetailsSheet({
  member,
  classes,
  onClose,
  onSaved,
}: {
  member: MemberRow | null;
  classes: ClassRow[];
  onClose: () => void;
  onSaved: (res: OpResult) => void;
}) {
  const [names, setNames] = useState<string[]>(["", "", "", ""]);
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState<DOB>({ day: null, month: null, year: null });
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [gender, setGender] = useState<Gender>("male");
  const [classId, setClassId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // تعبئة النموذج من بيانات المخدوم عند الفتح
  useEffect(() => {
    if (!member) return;
    setNames([...splitNameParts(member.name)]);
    setCode(member.code || "");
    // المخزّن "+2" + 11 رقم → نعرض الـ11 رقم المحلية فقط
    setPhone(member.phone ? normalizePhone(member.phone) : "");
    setDob(isoToParts(member.birth_date));
    setAddress(member.address || "");
    setNotes(member.notes || "");
    setGender(member.gender);
    setClassId(member.class_id || "");
    setError(null);
  }, [member]);

  if (!member) return null;

  const setName = (i: number, v: string) =>
    setNames((prev) => prev.map((n, idx) => (idx === i ? v : n)));

  const handleSave = async () => {
    setError(null);
    if (!names[0].trim()) {
      setError("الاسم الأول مطلوب.");
      return;
    }
    if (phone && !isValidPhone(normalizePhone(phone))) {
      setError("رقم التليفون يجب أن يكون 11 رقماً يبدأ بـ 0 (أو 10 أرقام بدون الصفر).");
      return;
    }
    if (!code.trim()) {
      setError("الكود مطلوب.");
      return;
    }
    setSaving(true);
    const res = await updateMember(member.id, {
      name: joinNameParts(names),
      code: code.trim(),
      phone: phone ? phoneForStorage(phone) : null,
      birth_date: partsToISO(dob.day, dob.month, dob.year),
      address: address.trim() || null,
      notes: notes.trim() || null,
      gender,
      class_id: classId || null,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    onSaved(res);
    onClose();
  };

  const input =
    "w-full rounded-lg border border-primary-soft bg-surface-muted px-3 py-2.5 text-sm text-ink outline-none focus:border-primary";

  return (
    <Sheet title={`بيانات — ${member.name || "—"}`} onClose={onClose}>
      <div className="space-y-3">
        {/* صورة + ملخص */}
        <div className="flex items-center gap-3 rounded-lg bg-surface-muted p-3">
          <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg btn-gradient text-white">
            {member.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={member.photo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <User className="h-7 w-7" />
            )}
          </div>
          <div className="min-w-0 text-xs text-ink-muted">
            <p>
              الحضور: <b className="text-ink">{member.attendance_count ?? 0}</b> —
              الرصيد: <b className="text-ink">{member.opening_balance ?? 0}</b>
            </p>
            <p className="truncate" dir="ltr">{member.code}</p>
          </div>
        </div>

        {/* الاسم رباعي */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-muted">الاسم رباعي</label>
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

        {/* الكود */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-muted">الكود</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            dir="ltr"
            className={input}
          />
        </div>

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

        {/* النوع + الفصل */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-muted">النوع</label>
            <div className="flex gap-1.5">
              {(["male", "female"] as Gender[]).map((g) => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition active:scale-95 ${
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
                <option key={c.id} value={c.id}>
                  {classDisplayName(c)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-accent-soft px-3 py-2.5 text-sm font-semibold text-accent">
            {error}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-lg grad-teal py-3 text-sm font-bold text-white shadow-soft active:scale-95 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          حفظ التعديلات
        </button>
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/*  3) تأكيد إلغاء (حذف) المخدوم                                         */
/* ------------------------------------------------------------------ */
export function MemberDeleteSheet({
  member,
  onClose,
  onDeleted,
}: {
  member: MemberRow | null;
  onClose: () => void;
  onDeleted: (memberId: string, message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!member) return null;

  const handleDelete = async () => {
    setBusy(true);
    setError(null);
    const res = await deleteMember(member.id);
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    onDeleted(member.id, res.message);
    onClose();
  };

  return (
    <Sheet title="إلغاء المخدوم" onClose={onClose}>
      <div className="space-y-3 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-rose-100 text-rose-600">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <p className="text-sm font-bold text-ink">
          هل أنت متأكد من إلغاء المخدوم
          <br />
          «{member.name || "—"}»؟
        </p>
        <p className="text-xs text-ink-muted">
          سيُحذف المخدوم نهائياً مع سجل حضوره ونقاطه — لا يمكن التراجع عن هذه الخطوة.
        </p>

        {error && (
          <div className="rounded-lg bg-accent-soft px-3 py-2.5 text-sm font-semibold text-accent">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onClose}
            className="rounded-lg bg-surface-muted py-3 text-sm font-bold text-ink active:scale-95"
          >
            رجوع
          </button>
          <button
            onClick={handleDelete}
            disabled={busy}
            className="flex items-center justify-center gap-2 rounded-lg bg-rose-600 py-3 text-sm font-bold text-white shadow-soft active:scale-95 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
            إلغاء المخدوم
          </button>
        </div>
      </div>
    </Sheet>
  );
}
