/** أنواع نظام المتجر (المخزون + الفواتير). */

export type StoreItemRow = {
  id: string;
  code: string; // كود QR الخاص بالصنف
  name: string;
  points_price: number;
  stock: number;
  photo_path: string | null;
  photo_url: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type StoreInvoiceRow = {
  id: string;
  invoice_no: number;
  member_id: string;
  total_points: number;
  created_by?: string | null;
  created_at: string;
};

export type StoreInvoiceItemRow = {
  id: string;
  invoice_id: string;
  item_id: string | null;
  item_name: string;
  photo_url: string | null;
  unit_price: number;
  qty: number;
  line_total: number;
};

/** بند في سلة الشراء (POS). */
export type CartLine = {
  item: StoreItemRow;
  qty: number;
};

/** نتيجة إتمام الشراء. */
export type CheckoutResult =
  | {
      ok: true;
      invoiceId: string;
      invoiceNo: number;
      totalPoints: number;
      newBalance: number;
      message: string;
    }
  | { ok: false; message: string };

/** توليد كود صنف فريد للـ QR (بادئة ITEM لتمييزه عن أكواد المخدومين). */
export function generateItemCode(): string {
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ITEM-${Date.now()}-${rand}`;
}

/** هل هذا الكود كود صنف؟ */
export function isItemCode(code: string): boolean {
  return /^ITEM-/i.test((code || "").trim());
}
