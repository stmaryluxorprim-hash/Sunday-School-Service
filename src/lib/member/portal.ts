/**
 * Member portal data layer — everything goes through SECURITY DEFINER RPCs
 * keyed by the member's secret card code (see sql/0008_member_portal.sql).
 * Works with the public anon key; no Supabase auth session required.
 */
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export type MemberPortalProfile = {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  birth_date: string | null;
  address: string | null;
  notes: string | null;
  photo_url: string | null;
  opening_balance: number;
  attendance_count: number;
  gender: "male" | "female";
  class_name: string | null;
  created_at: string;
};

export type MemberAttendanceEntry = {
  id: string;
  attended_on: string;
  created_at: string;
};

export type MemberPointsEntry = {
  id: string;
  amount: number;
  reason: string | null;
  created_at: string;
};

export type MemberMessage = {
  id: string;
  body: string;
  sender_name: string | null;
  from_member: boolean;
  created_at: string;
};

export type MemberInvoiceItem = {
  item_name: string;
  photo_url: string | null;
  unit_price: number;
  qty: number;
  line_total: number;
};

export type MemberInvoice = {
  id: string;
  invoice_no: number;
  total_points: number;
  created_at: string;
  items: MemberInvoiceItem[];
};

export type MemberAchievement = {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  points: number;
  earned: boolean;
  awarded_at: string | null;
};

export type MemberEvent = {
  id: string;
  title: string;
  description: string | null;
  kind: "event" | "announcement";
  event_date: string | null;
  event_time: string | null;
  location: string | null;
  created_at: string;
};

export type MemberNotification = {
  id: string;
  body: string;
  sender_name: string | null;
  created_at: string;
  is_read: boolean;
};

/** Anonymous Supabase client (no cookies/session needed for the portal RPCs). */
function portalClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createSupabaseClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Validate a card code → returns short member info or null. */
export async function memberLogin(
  code: string
): Promise<{ id: string; code: string; name: string; photo_url: string | null } | null> {
  const supabase = portalClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("member_portal_login", {
    p_code: code.trim(),
  });
  if (error || !data) return null;
  const row = Array.isArray(data) ? data[0] : data;
  return row ?? null;
}

export async function getMemberProfile(code: string): Promise<MemberPortalProfile | null> {
  const supabase = portalClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("member_portal_get", { p_code: code });
  if (error || !data) return null;
  const row = Array.isArray(data) ? data[0] : data;
  return (row as MemberPortalProfile) ?? null;
}

export async function getMemberAttendance(code: string): Promise<MemberAttendanceEntry[]> {
  const supabase = portalClient();
  if (!supabase) return [];
  const { data } = await supabase.rpc("member_portal_attendance", { p_code: code });
  return (data as MemberAttendanceEntry[]) ?? [];
}

export async function getMemberPoints(code: string): Promise<MemberPointsEntry[]> {
  const supabase = portalClient();
  if (!supabase) return [];
  const { data } = await supabase.rpc("member_portal_points", { p_code: code });
  return (data as MemberPointsEntry[]) ?? [];
}

export async function getMemberMessages(code: string): Promise<MemberMessage[]> {
  const supabase = portalClient();
  if (!supabase) return [];
  const { data } = await supabase.rpc("member_portal_messages", { p_code: code });
  return (data as MemberMessage[]) ?? [];
}

export async function sendMemberMessage(
  code: string,
  body: string
): Promise<MemberMessage | null> {
  const supabase = portalClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("member_portal_send_message", {
    p_code: code,
    p_body: body,
  });
  if (error || !data) return null;
  const row = Array.isArray(data) ? data[0] : data;
  return (row as MemberMessage) ?? null;
}

/** فواتير مشتريات المخدوم من المتجر (كل فاتورة مع بنودها). */
export async function getMemberInvoices(code: string): Promise<MemberInvoice[]> {
  const supabase = portalClient();
  if (!supabase) return [];
  const { data } = await supabase.rpc("member_portal_invoices", { p_code: code });
  return (data as MemberInvoice[]) ?? [];
}

/** إنجازات المخدوم — كل التعريفات مع حالة الحصول (يظهر ما يمنحه الخادم فوراً). */
export async function getMemberAchievements(code: string): Promise<MemberAchievement[]> {
  const supabase = portalClient();
  if (!supabase) return [];
  const { data } = await supabase.rpc("member_portal_achievements", { p_code: code });
  return (data as MemberAchievement[]) ?? [];
}

/** الإعلانات والفعاليات المنشورة من صفحة الخادم. */
export async function getMemberEvents(code: string): Promise<MemberEvent[]> {
  const supabase = portalClient();
  if (!supabase) return [];
  const { data } = await supabase.rpc("member_portal_events", { p_code: code });
  return (data as MemberEvent[]) ?? [];
}

export async function getMemberNotifications(code: string): Promise<MemberNotification[]> {
  const supabase = portalClient();
  if (!supabase) return [];
  const { data } = await supabase.rpc("member_portal_notifications", { p_code: code });
  return (data as MemberNotification[]) ?? [];
}

export async function markMemberNotificationsRead(code: string): Promise<void> {
  const supabase = portalClient();
  if (!supabase) return;
  await supabase.rpc("member_portal_mark_notifications_read", { p_code: code });
}
