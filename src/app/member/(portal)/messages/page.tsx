import { MessageCircle } from "lucide-react";
import { getMemberSession } from "@/lib/member/server";
import { getMemberMessages } from "@/lib/member/portal";
import { PageHero } from "@/components/ui/page-card";
import { MemberChat } from "@/components/member/member-chat";

export const dynamic = "force-dynamic";

/** صفحة الرسائل — شات مباشر بين المخدوم والخدّام. */
export default async function MemberMessagesPage() {
  const session = (await getMemberSession())!;
  const messages = await getMemberMessages(session.code);

  return (
    <div>
      <PageHero
        title="الرسائل"
        subtitle="تواصل مع الخدّام مباشرة"
        icon={MessageCircle}
        grad="grad-green"
      />
      <MemberChat initialMessages={messages} />
    </div>
  );
}
