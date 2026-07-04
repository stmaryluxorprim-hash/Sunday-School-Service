"use server";

import { revalidatePath } from "next/cache";
import { getMemberSession } from "@/lib/member/server";
import { sendMemberMessage, getMemberMessages } from "@/lib/member/portal";
import type { MemberMessage } from "@/lib/member/portal";

export type SendResult = {
  ok: boolean;
  error?: string;
  message?: MemberMessage;
};

/** إرسال رسالة من المخدوم إلى محادثته مع الخدّام. */
export async function sendMessageAction(body: string): Promise<SendResult> {
  const session = await getMemberSession();
  if (!session) return { ok: false, error: "انتهت الجلسة. سجّل الدخول مرة أخرى." };

  const text = (body || "").trim();
  if (!text) return { ok: false, error: "اكتب رسالة أولاً." };
  if (text.length > 2000) return { ok: false, error: "الرسالة طويلة جداً." };

  const message = await sendMemberMessage(session.code, text);
  if (!message) return { ok: false, error: "تعذّر الإرسال. حاول مرة أخرى." };

  revalidatePath("/member/messages");
  return { ok: true, message };
}

/** إعادة تحميل الرسائل (للتحديث الدوري من العميل). */
export async function refreshMessagesAction(): Promise<MemberMessage[]> {
  const session = await getMemberSession();
  if (!session) return [];
  return getMemberMessages(session.code);
}
