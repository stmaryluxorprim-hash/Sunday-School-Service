import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { SettingsProvider } from "@/context/settings-context";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-arabic",
  display: "swap",
});

/** Build metadata (title + app icon) from the uploaded branding when available. */
export async function generateMetadata(): Promise<Metadata> {
  let serviceName = "خدمة الكنيسة";
  let logoUrl: string | null = null;

  if (isSupabaseConfigured) {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("app_settings")
        .select("service_name, logo_url")
        .limit(1)
        .maybeSingle();
      if (data) {
        serviceName = (data.service_name as string) || serviceName;
        logoUrl = (data.logo_url as string) || null;
      }
    } catch {
      /* ignore — fall back to defaults */
    }
  }

  const icons = logoUrl
    ? { icon: logoUrl, apple: logoUrl, shortcut: logoUrl }
    : { icon: "/favicon.ico", apple: "/icons/apple-touch-icon.png" };

  return {
    title: serviceName,
    description: "تطبيق إدارة خدمات الكنيسة",
    manifest: "/manifest.webmanifest",
    icons,
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: serviceName,
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#6d5dfc",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable} suppressHydrationWarning>
      <body>
        <SettingsProvider>{children}</SettingsProvider>
      </body>
    </html>
  );
}
