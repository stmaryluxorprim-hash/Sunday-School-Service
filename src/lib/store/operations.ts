/** عمليات المتجر — الأصناف + إتمام الشراء + الفواتير. */

import { createClient } from "@/lib/supabase/client";
import { StoreItemRow, StoreInvoiceRow, StoreInvoiceItemRow, CheckoutResult } from "./types";

// ---------------------------------------------------------------------------
// الأصناف
// ---------------------------------------------------------------------------

export async function listItems(): Promise<StoreItemRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("store_items")
    .select("*")
    .order("created_at", { ascending: false });
  return (data as StoreItemRow[]) ?? [];
}

export async function findItemByCode(code: string): Promise<StoreItemRow | null> {
  const clean = (code || "").trim();
  if (!clean) return null;
  const supabase = createClient();
  const { data } = await supabase
    .from("store_items")
    .select("*")
    .eq("code", clean)
    .maybeSingle();
  return (data as StoreItemRow) ?? null;
}

export type ItemPayload = {
  code: string;
  name: string;
  points_price: number;
  stock: number;
  photo_path?: string | null;
  photo_url?: string | null;
  is_active?: boolean;
};

export async function createItem(
  payload: ItemPayload
): Promise<{ ok: boolean; item?: StoreItemRow; message: string }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("store_items")
    .insert(payload)
    .select("*")
    .single();
  if (error || !data) return { ok: false, message: "تعذّر إضافة الصنف" };
  return { ok: true, item: data as StoreItemRow, message: "تمت إضافة الصنف" };
}

export async function updateItem(
  id: string,
  patch: Partial<ItemPayload>
): Promise<{ ok: boolean; item?: StoreItemRow; message: string }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("store_items")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) return { ok: false, message: "تعذّر حفظ التعديلات" };
  return { ok: true, item: data as StoreItemRow, message: "تم حفظ التعديلات" };
}

export async function deleteItem(id: string): Promise<{ ok: boolean; message: string }> {
  const supabase = createClient();
  const { error } = await supabase.from("store_items").delete().eq("id", id);
  if (error) return { ok: false, message: "تعذّر حذف الصنف" };
  return { ok: true, message: "تم حذف الصنف" };
}

// ---------------------------------------------------------------------------
// إتمام الشراء (checkout)
// ---------------------------------------------------------------------------

export async function storeCheckout(
  memberId: string,
  lines: { item_id: string; qty: number }[]
): Promise<CheckoutResult> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("store_checkout", {
    p_member_id: memberId,
    p_items: lines,
  });

  if (error) {
    const msg = error.message || "";
    const stock = msg.match(/out_of_stock:([^:]+):(\d+)/);
    if (stock)
      return {
        ok: false,
        message: `الكمية غير كافية من «${stock[1]}» — المتاح: ${stock[2]}`,
      };
    const bal = msg.match(/insufficient_balance:([\d.]+):([\d.]+)/);
    if (bal)
      return {
        ok: false,
        message: `رصيد النقاط غير كافٍ — الرصيد: ${Number(bal[1])} والمطلوب: ${Number(bal[2])}`,
      };
    if (msg.includes("empty_cart")) return { ok: false, message: "السلة فارغة" };
    if (msg.includes("item_not_found")) return { ok: false, message: "صنف غير موجود أو موقوف" };
    if (msg.includes("member_not_found")) return { ok: false, message: "المخدوم غير موجود" };
    return { ok: false, message: "تعذّر إتمام العملية" };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: false, message: "تعذّر إتمام العملية" };
  return {
    ok: true,
    invoiceId: row.invoice_id,
    invoiceNo: Number(row.invoice_no),
    totalPoints: Number(row.total_points),
    newBalance: Number(row.new_balance),
    message: `تمت العملية — فاتورة #${row.invoice_no}`,
  };
}

// ---------------------------------------------------------------------------
// الفواتير (للخادم)
// ---------------------------------------------------------------------------

export type InvoiceWithItems = StoreInvoiceRow & {
  member_name?: string;
  items: StoreInvoiceItemRow[];
};

export async function listInvoices(limit = 100): Promise<InvoiceWithItems[]> {
  const supabase = createClient();
  const { data: invoices } = await supabase
    .from("store_invoices")
    .select("*, members(name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (!invoices?.length) return [];

  const ids = invoices.map((i) => i.id);
  const { data: items } = await supabase
    .from("store_invoice_items")
    .select("*")
    .in("invoice_id", ids);

  const byInvoice = new Map<string, StoreInvoiceItemRow[]>();
  (items ?? []).forEach((it) => {
    const arr = byInvoice.get(it.invoice_id) ?? [];
    arr.push(it as StoreInvoiceItemRow);
    byInvoice.set(it.invoice_id, arr);
  });

  return invoices.map((inv) => ({
    ...(inv as StoreInvoiceRow),
    member_name:
      (inv as { members?: { name?: string } }).members?.name ?? "—",
    items: byInvoice.get(inv.id) ?? [],
  }));
}
