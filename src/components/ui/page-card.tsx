import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

export function PageHero({
  title,
  subtitle,
  icon: Icon,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
}) {
  return (
    <div className="animate-fade-up glass mb-4 flex items-center gap-4 rounded-3xl p-5 shadow-card border border-white/30">
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl btn-gradient shadow-soft">
        <Icon className="h-7 w-7 text-white" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-ink">{title}</h2>
        <p className="text-sm text-ink-muted">{subtitle}</p>
      </div>
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`animate-fade-up rounded-3xl bg-surface p-4 shadow-card border border-white/40 ${className}`}
    >
      {children}
    </div>
  );
}

export function ComingSoon({ note }: { note: string }) {
  return (
    <Card className="text-center">
      <div className="py-6">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary">
          🚧
        </div>
        <p className="text-sm font-semibold text-ink">قيد الإنشاء</p>
        <p className="mt-1 text-xs text-ink-muted">{note}</p>
      </div>
    </Card>
  );
}
