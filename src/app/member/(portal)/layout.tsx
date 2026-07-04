import { redirect } from "next/navigation";
import { getMemberSession } from "@/lib/member/server";
import { MemberShell } from "@/components/member/member-shell";

/**
 * تخطيط بوابة المخدوم — يتحقق من جلسة الكارت الموقَّعة ثم يعرض
 * الهيكل (هيدر + تنقّل سفلي) حول صفحات البوابة.
 */
export default async function MemberPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getMemberSession();
  if (!session) redirect("/member/login");

  return <MemberShell memberName={session.name}>{children}</MemberShell>;
}
