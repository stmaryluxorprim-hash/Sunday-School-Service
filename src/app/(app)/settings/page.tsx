import Link from "next/link";
import { Settings as SettingsIcon, Palette, ChevronLeft, ShieldCheck, Users, GraduationCap } from "lucide-react";
import { PageHero } from "@/components/ui/page-card";

/** Settings is a list of cards; each opens a dedicated sub-page. */
const SETTINGS_CARDS = [
  {
    key: "identity",
    title: "الهوية",
    desc: "اسم الخدمة، الشعار، الألوان، واللوجو",
    href: "/settings/identity",
    icon: Palette,
  },
  {
    key: "classes",
    title: "إدارة الفصول",
    desc: "إضافة وتعديل وحذف الفصول",
    href: "/settings/classes",
    icon: GraduationCap,
  },
  // Future cards (RBAC step):
  {
    key: "roles",
    title: "الأدوار والصلاحيات",
    desc: "إدارة الصلاحيات (RBAC) — قريباً",
    href: "/settings",
    icon: ShieldCheck,
    disabled: true,
  },
  {
    key: "profiles",
    title: "الملفات الشخصية",
    desc: "إدارة المستخدمين والملفات — قريباً",
    href: "/settings",
    icon: Users,
    disabled: true,
  },
];

export default function SettingsPage() {
  return (
    <div>
      <PageHero title="الإعدادات" subtitle="تخصيص التطبيق" icon={SettingsIcon} />

      <div className="space-y-3">
        {SETTINGS_CARDS.map((card) => {
          const Icon = card.icon;
          const disabled = "disabled" in card && card.disabled;
          const inner = (
            <div
              className={`animate-fade-up flex items-center gap-4 rounded-3xl bg-surface p-4 shadow-card border border-white/40 transition ${
                disabled ? "opacity-50" : "active:scale-[0.98]"
              }`}
            >
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl btn-gradient text-white shadow-soft">
                <Icon className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-ink">{card.title}</p>
                <p className="truncate text-xs text-ink-muted">{card.desc}</p>
              </div>
              {!disabled && <ChevronLeft className="h-5 w-5 text-ink-muted" />}
            </div>
          );

          return disabled ? (
            <div key={card.key}>{inner}</div>
          ) : (
            <Link key={card.key} href={card.href}>
              {inner}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
