import { cookies } from "next/headers";
import {
  MEMBER_COOKIE,
  verifyMemberToken,
  type MemberSession,
} from "@/lib/member/session";

/** Read + verify the member session cookie (server components / actions). */
export async function getMemberSession(): Promise<MemberSession | null> {
  const token = cookies().get(MEMBER_COOKIE)?.value;
  return verifyMemberToken(token);
}
