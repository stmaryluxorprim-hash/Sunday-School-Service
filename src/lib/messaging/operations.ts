import { createClient } from "@/lib/supabase/client";
import { ConversationRow, MessageRow } from "@/lib/messaging/types";

/** جلب كل المحادثات مرتّبة بأحدث نشاط. */
export async function listConversations(): Promise<ConversationRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("conversations")
    .select("*")
    .order("last_at", { ascending: false });
  return (data as ConversationRow[]) ?? [];
}

/** جلب رسائل محادثة مرتّبة زمنياً. */
export async function listMessages(conversationId: string): Promise<MessageRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  return (data as MessageRow[]) ?? [];
}

/** إنشاء محادثة جديدة (عامة أو بعنوان). */
export async function createConversation(
  title: string
): Promise<ConversationRow | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("conversations")
    .insert({ title: title || "محادثة جديدة", created_by: user?.id ?? null })
    .select("*")
    .single();
  if (error) return null;
  if (user?.id) {
    await supabase
      .from("conversation_members")
      .insert({ conversation_id: (data as ConversationRow).id, user_id: user.id });
  }
  return data as ConversationRow;
}

/** إيجاد/إنشاء محادثة مرتبطة بمخدوم (للرسالة الداخلية من صفحة البيانات). */
export async function getOrCreateMemberConversation(
  memberId: string,
  title?: string
): Promise<ConversationRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_or_create_member_conversation", {
    p_member_id: memberId,
    p_title: title ?? null,
  });
  if (error) return null;
  return data as ConversationRow;
}

/** إرسال رسالة نصية إلى محادثة. */
export async function sendMessage(
  conversationId: string,
  body: string,
  senderName: string
): Promise<MessageRow | null> {
  const text = body.trim();
  if (!text) return null;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user?.id ?? null,
      sender_name: senderName,
      body: text,
    })
    .select("*")
    .single();
  if (error) return null;
  return data as MessageRow;
}

/** حذف محادثة (وكل رسائلها عبر cascade). */
export async function deleteConversation(conversationId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("conversations")
    .delete()
    .eq("id", conversationId);
  return !error;
}
