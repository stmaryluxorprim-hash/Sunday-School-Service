import { ShoppingBag, ReceiptText, Coins } from "lucide-react";
import { getMemberSession } from "@/lib/member/server";
import { getMemberInvoices } from "@/lib/member/portal";
import { PageHero, Card } from "@/components/ui/page-card";

export const dynamic = "force-dynamic";

const WHEN_FMT = new Intl.DateTimeFormat("ar-EG", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** صفحة المشتريات — فواتير المتجر الكاملة (البنود + الأسعار + الإجمالي). */
export default async function MemberPurchasesPage() {
  const session = (await getMemberSession())!;
  const invoices = await getMemberInvoices(session.code);

  const totalSpent = invoices.reduce((s, i) => s + Number(i.total_points), 0);

  return (
    <div>
      <PageHero
        title="مشترياتي"
        subtitle="فواتير هداياك من المتجر"
        icon={ShoppingBag}
        grad="grad-green"
      />

      {/* ملخص */}
      <Card className="mb-3 text-center">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-primary-soft p-3">
            <p className="text-xs font-bold text-primary">عدد الفواتير</p>
            <p className="text-2xl font-bold text-primary" dir="ltr">
              {invoices.length.toLocaleString("ar-EG")}
            </p>
          </div>
          <div className="rounded-2xl bg-accent-soft p-3">
            <p className="flex items-center justify-center gap-1 text-xs font-bold text-accent">
              <Coins className="h-3.5 w-3.5" />
              إجمالي النقاط المستخدمة
            </p>
            <p className="text-2xl font-bold text-accent" dir="ltr">
              {totalSpent.toLocaleString("ar-EG")}
            </p>
          </div>
        </div>
      </Card>

      {invoices.length === 0 ? (
        <Card className="py-10 text-center">
          <ShoppingBag className="mx-auto mb-2 h-10 w-10 text-ink-muted" />
          <p className="text-sm font-semibold text-ink">لا توجد مشتريات بعد</p>
          <p className="mt-1 text-xs text-ink-muted">
            عندما تشتري هدية من المتجر ستظهر فاتورتها هنا 🎁
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => (
            <Card key={inv.id} className="!p-0 overflow-hidden">
              {/* رأس الفاتورة */}
              <div className="flex items-center gap-3 grad-green px-4 py-3 text-white">
                <ReceiptText className="h-5 w-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">فاتورة #{Number(inv.invoice_no)}</p>
                  <p className="text-[11px] opacity-90">
                    {WHEN_FMT.format(new Date(inv.created_at))}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-white/20 px-3 py-1 text-sm font-bold" dir="ltr">
                  -{Number(inv.total_points).toLocaleString("ar-EG")}
                </span>
              </div>

              {/* البنود */}
              <div className="space-y-2 p-3">
                {(inv.items ?? []).map((li, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 rounded-2xl bg-surface-muted p-2.5"
                  >
                    {li.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={li.photo_url}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-surface text-xl">
                        🎁
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-ink">
                        {li.item_name}
                      </span>
                      <span className="block text-[11px] text-ink-muted">
                        {Number(li.unit_price).toLocaleString("ar-EG")} نقطة × {li.qty}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-bold text-ink" dir="ltr">
                      {Number(li.line_total).toLocaleString("ar-EG")}
                    </span>
                  </div>
                ))}

                {/* الإجمالي */}
                <div className="flex items-center justify-between rounded-2xl border border-white/40 bg-surface-muted px-3 py-2.5 text-sm font-bold">
                  <span className="text-ink">الإجمالي</span>
                  <span className="text-accent" dir="ltr">
                    -{Number(inv.total_points).toLocaleString("ar-EG")} نقطة
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
