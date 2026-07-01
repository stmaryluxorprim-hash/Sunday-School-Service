import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // If Supabase isn't configured yet, send users to login instead of crashing.
  if (!isSupabaseConfigured) {
    redirect("/login");
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = user
    ? {
        id: user.id,
        name:
          (user.user_metadata?.full_name as string | undefined) ??
          user.email?.split("@")[0] ??
          "مستخدم",
        email: user.email ?? "",
      }
    : null;

  return <AppShell profile={profile}>{children}</AppShell>;
}
