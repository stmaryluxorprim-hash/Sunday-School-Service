"use server";

import { revalidatePath } from "next/cache";
import { getMemberSession } from "@/lib/member/server";
import { markMemberNotificationsRead } from "@/lib/member/portal";

/** تعليم كل الإشعارات كمقروءة للمخدوم الحالي. */
export async function markAllReadAction(): Promise<void> {
  const session = await getMemberSession();
  if (!session) return;
  await markMemberNotificationsRead(session.code);
  revalidatePath("/member/notifications");
  revalidatePath("/member");
}
