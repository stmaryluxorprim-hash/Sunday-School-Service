import { UserRound } from "lucide-react";
import { getMemberSession } from "@/lib/member/server";
import { getMemberProfile } from "@/lib/member/portal";
import { PageHero, Card } from "@/components/ui/page-card";
import { MemberCardQR } from "@/components/member/member-card-qr";

export const dynamic = "force-dynamic";

const DATE_FMT = new Intl.DateTimeFormat("ar-EG", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** صفحة بياناتي — بيانات العضوية + كارت QR رقمي. */
export default async function MemberDataPage() {
  const session = (await getMemberSession())!;
  const profile = await getMemberProfile(session.code);

  if (!profile) {
    return (
      <div>
        <PageHero title="بياناتي" subtitle="بيانات العضوية" icon={UserRound} grad="grad-violet" />
        <Card>
          <p className="py-6 text-center text-sm text-ink-muted">
            تعذّر تحميل البيانات. حاول مرة أخرى.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHero
        title="بياناتي"
        subtitle="بيانات العضوية والكارت الرقمي"
        icon={UserRound}
        grad="grad-violet"
      />

      {/* Digital card */}
      <Card className="mb-3">
        <p className="mb-3 text-xs font-bold text-ink-muted">كارت العضوية الرقمي</p>
        <div className="flex flex-col items-center gap-2">
          {profile.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.photo_url}
              alt=""
              className="h-20 w-20 rounded-2xl object-cover shadow-soft"
            />
          )}
          <p className="text-base font-bold text-ink">{profile.name}</p>
          <MemberCardQR code={profile.code} />
          <p className="text-xs text-ink-muted" dir="ltr">
            {profile.code}
          </p>
        </div>
      </Card>

      {/* Details */}
      <Card>
        <p className="mb-3 text-xs font-bold text-ink-muted">البيانات المسجَّلة</p>
        <dl className="space-y-1">
          <Row label="الاسم" value={profile.name} />
          <Row label="النوع" value={profile.gender === "male" ? "ذكر" : "أنثى"} />
          <Row label="الفصل" value={profile.class_name || "—"} />
          <Row
            label="تاريخ الميلاد"
            value={
              profile.birth_date
                ? DATE_FMT.format(new Date(profile.birth_date + "T00:00:00"))
                : "—"
            }
          />
          <Row label="التليفون" value={profile.phone || "—"} dir="ltr" />
          <Row label="العنوان" value={profile.address || "—"} />
          <Row
            label="تاريخ التسجيل"
            value={
              profile.created_at ? DATE_FMT.format(new Date(profile.created_at)) : "—"
            }
          />
        </dl>
        <p className="mt-3 rounded-2xl bg-primary-soft p-2.5 text-center text-[11px] font-semibold text-primary">
          لتعديل أي بيانات تواصل مع الخدّام من صفحة الرسائل.
        </p>
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  dir,
}: {
  label: string;
  value: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface-muted px-3 py-2.5">
      <dt className="shrink-0 text-xs font-bold text-ink-muted">{label}</dt>
      <dd className="min-w-0 truncate text-sm font-semibold text-ink" dir={dir}>
        {value}
      </dd>
    </div>
  );
}
