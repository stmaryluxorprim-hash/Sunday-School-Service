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
    grad: "grad-accent",
  },
  {
    key: "classes",
    title: "إدارة الفصول",
    desc: "إضافة وتعديل وحذف الفصول",
    href: "/settings/classes",
    icon: GraduationCap,
    grad: "grad-teal",
  },
  // Future cards (RBAC step):
  {
    key: "roles",
    title: "الأدوار والصلاحيات",
    desc: "إدارة الصلاحيات (RBAC) — قريباً",
    href: "/settings",
    icon: ShieldCheck,
    grad: "grad-violet",
    disabled: true,
  },
  {
    key: "profiles",
    title: "الملفات الشخصية",
    desc: "إدارة المستخدمين والملفات — قريباً",
    href: "/settings",
    icon: Users,
    grad: "grad-amber",
    disabled: true,
  },
];

export default function SettingsPage() {
  return (
    <div>
      <PageHero
        title="الإعدادات"
        subtitle="تخصيص التطبيق"
        icon={SettingsIcon}
        grad="grad-accent"
      />

      <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
        {SETTINGS_CARDS.map((card) => {
          const Icon = card.icon;
          const disabled = "disabled" in card && card.disabled;
          const inner = (
            <div
              className={`animate-fade-up flex items-center gap-4 rounded-xl bg-surface p-4 shadow-card border border-white/40 transition ${
                disabled ? "opacity-50" : "active:scale-[0.98] hover:shadow-soft"
              }`}
            >
              <div
                className={`grid h-12 w-12 shrink-0 place-items-center rounded-lg text-white shadow-soft ${card.grad}`}
              >
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
            <Link key={card.key} href={card.href} className="block">
              {inner}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
