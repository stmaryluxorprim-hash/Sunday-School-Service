"use client";

/**
 * صفحة المتجر — نظام المخزون والهدايا:
 *   * الأصناف : إضافة/تعديل هدايا (اسم + صورة + سعر نقاط + كمية)
 *               + طباعة بطاقات الأصناف (1 أو 4 في الصفحة) بصورة وسعر وQR.
 *   * البيع   : POS — مسح QR الأصناف ثم كارت المخدوم → خصم نقاط + فاتورة.
 *   * الفواتير: سجل كل عمليات البيع مع البنود.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Store,
  Gift,
  ScanLine,
  ReceiptText,
  Plus,
  Pencil,
  Trash2,
  Printer,
  Search,
  Loader2,
  PackageX,
  ChevronDown,
} from "lucide-react";
import { PageHero, Card } from "@/components/ui/page-card";
import { useSettings } from "@/context/settings-context";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { StoreItemRow } from "@/lib/store/types";
import {
  listItems,
  deleteItem,
  listInvoices,
  InvoiceWithItems,
} from "@/lib/store/operations";
import { deleteImage } from "@/lib/storage/upload";
import { ItemEditor } from "@/components/store/item-editor";
import { LabelPrintSheet } from "@/components/store/label-print-sheet";
import { CheckoutPanel } from "@/components/store/checkout-panel";

type Tab = "items" | "pos" | "invoices";

const TABS: { key: Tab; label: string; Icon: typeof Gift }[] = [
  { key: "items", label: "الأصناف", Icon: Gift },
  { key: "pos", label: "البيع", Icon: ScanLine },
  { key: "invoices", label: "الفواتير", Icon: ReceiptText },
];

const WHEN_FMT = new Intl.DateTimeFormat("ar-EG", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default function StorePage() {
  const { branding } = useSettings();
  const [tab, setTab] = useState<Tab>("items");
  const [items, setItems] = useState<StoreItemRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<StoreItemRow | null | "new">(null);
  const [printSheet, setPrintSheet] = useState<{ preselectedId?: string } | null>(null);
  const [openInvoice, setOpenInvoice] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (t: string) => {
    setToast(t);
    setTimeout(() => setToast(null), 2500);
  };

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    const [it, inv] = await Promise.all([listItems(), listInvoices()]);
    setItems(it);
    setInvoices(inv);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredItems = useMemo(() => {
    const q = search.trim();
    if (!q) return items;
    return items.filter((i) => i.name.includes(q) || i.code.includes(q));
  }, [items, search]);

  const removeItem = async (i: StoreItemRow) => {
    if (!confirm(`حذف «${i.name}»؟ لن يؤثر ذلك على الفواتير السابقة.`)) return;
    const res = await deleteItem(i.id);
    if (res.ok && i.photo_path) await deleteImage(i.photo_path).catch(() => {});
    showToast(res.message);
    load();
  };

  return (
    <div>
      <PageHero
        title="المتجر"
        subtitle="الهدايا والمخزون والبيع بالنقاط"
        icon={Store}
        grad="grad-green"
      />

      {!isSupabaseConfigured && (
        <Card className="mb-4 text-center text-sm text-ink-muted">
          يلزم إعداد Supabase أولاً لاستخدام هذه الصفحة.
        </Card>
      )}

      {/* التبويبات */}
      <div className="animate-fade-up mb-3 grid grid-cols-3 gap-2 rounded-xl bg-surface p-2 shadow-card border border-white/40">
        {TABS.map((t) => {
          const active = tab === t.key;
          const Icon = t.Icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-sm font-bold transition active:scale-95 ${
                active ? "grad-green text-white shadow-soft" : "text-ink-muted"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ================= تبويب الأصناف ================= */}
      {tab === "items" && (
        <>
          <div className="mb-3 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث عن هدية..."
                className="w-full rounded-xl border border-white/40 bg-surface py-2.5 pr-9 pl-3 text-sm text-ink shadow-card outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <button
              onClick={() => setPrintSheet({})}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-surface px-3 py-2.5 text-sm font-bold text-green-600 shadow-card active:scale-95"
              title="طباعة بطاقات الأصناف"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">طباعة</span>
            </button>
            <button
              onClick={() => setEditing("new")}
              className="flex shrink-0 items-center gap-1.5 rounded-xl grad-green px-3 py-2.5 text-sm font-bold text-white shadow-soft active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">هدية جديدة</span>
            </button>
          </div>

          {loading ? (
            <Card className="grid place-items-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </Card>
          ) : filteredItems.length === 0 ? (
            <Card className="py-10 text-center">
              <Gift className="mx-auto mb-2 h-10 w-10 text-ink-muted" />
              <p className="text-sm font-semibold text-ink">لا توجد هدايا بعد</p>
              <p className="mt-1 text-xs text-ink-muted">أضِف أول هدية بزر «هدية جديدة»</p>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filteredItems.map((i) => (
                <Card key={i.id} className="!p-3">
                  <div className="relative mb-2">
                    {i.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={i.photo_url}
                        alt=""
                        className="h-28 w-full rounded-lg object-cover"
                      />
                    ) : (
                      <div className="grid h-28 w-full place-items-center rounded-lg bg-surface-muted text-4xl">
                        🎁
                      </div>
                    )}
                    {(!i.is_active || i.stock === 0) && (
                      <span className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        <PackageX className="h-3 w-3" />
                        {!i.is_active ? "موقوف" : "نفدت الكمية"}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-sm font-bold text-ink">{i.name}</p>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-600">
                      {Number(i.points_price)} نقطة
                    </span>
                    <span
                      className={`font-semibold ${
                        i.stock > 0 ? "text-ink-muted" : "text-rose-500"
                      }`}
                    >
                      الكمية: {i.stock}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => setPrintSheet({ preselectedId: i.id })}
                      className="grid h-8 place-items-center rounded-lg bg-green-50 text-green-600 active:scale-95"
                      title="طباعة بطاقة"
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditing(i)}
                      className="grid h-8 place-items-center rounded-lg bg-surface-muted text-ink active:scale-95"
                      title="تعديل"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => removeItem(i)}
                      className="grid h-8 place-items-center rounded-lg bg-red-50 text-red-600 active:scale-95"
                      title="حذف"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* ================= تبويب البيع (POS) ================= */}
      {tab === "pos" && <CheckoutPanel items={items} onCheckoutDone={load} />}

      {/* ================= تبويب الفواتير ================= */}
      {tab === "invoices" &&
        (loading ? (
          <Card className="grid place-items-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </Card>
        ) : invoices.length === 0 ? (
          <Card className="py-10 text-center">
            <ReceiptText className="mx-auto mb-2 h-10 w-10 text-ink-muted" />
            <p className="text-sm font-semibold text-ink">لا توجد فواتير بعد</p>
            <p className="mt-1 text-xs text-ink-muted">
              ستظهر هنا كل عمليات البيع بعد إتمامها من تبويب «البيع»
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {invoices.map((inv) => {
              const open = openInvoice === inv.id;
              return (
                <Card key={inv.id} className="!p-3">
                  <button
                    onClick={() => setOpenInvoice(open ? null : inv.id)}
                    className="flex w-full items-center gap-3 text-right"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl grad-green text-white shadow-soft">
                      <ReceiptText className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-ink">
                        فاتورة #{inv.invoice_no} — {inv.member_name}
                      </span>
                      <span className="block text-[11px] text-ink-muted">
                        {WHEN_FMT.format(new Date(inv.created_at))}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-bold text-accent" dir="ltr">
                      -{Number(inv.total_points)}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-ink-muted transition ${
                        open ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {open && (
                    <div className="mt-2 space-y-1.5 rounded-xl bg-surface-muted p-3">
                      {inv.items.map((li) => (
                        <div key={li.id} className="flex items-center gap-2.5 text-sm">
                          {li.photo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={li.photo_url}
                              alt=""
                              className="h-8 w-8 shrink-0 rounded-lg object-cover"
                            />
                          ) : (
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface text-sm">
                              🎁
                            </span>
                          )}
                          <span className="min-w-0 flex-1 truncate text-ink">
                            {li.item_name}{" "}
                            <span className="text-ink-muted">
                              ({Number(li.unit_price)} × {li.qty})
                            </span>
                          </span>
                          <span className="shrink-0 font-bold text-ink" dir="ltr">
                            {Number(li.line_total)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        ))}

      {/* ---------- المودالات ---------- */}
      {editing && (
        <ItemEditor
          item={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            showToast("تم الحفظ ✅");
            load();
          }}
        />
      )}

      {printSheet && (
        <LabelPrintSheet
          items={items}
          serviceName={branding.serviceName || ""}
          preselectedId={printSheet.preselectedId}
          onClose={() => setPrintSheet(null)}
        />
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-ink px-4 py-2 text-sm font-bold text-white shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}
