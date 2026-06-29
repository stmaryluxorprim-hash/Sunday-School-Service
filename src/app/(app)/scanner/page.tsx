import { ScanLine } from "lucide-react";
import { PageHero, Card } from "@/components/ui/page-card";

export default function ScannerPage() {
  return (
    <div>
      <PageHero title="الماسح" subtitle="مسح الكود لتسجيل الحضور" icon={ScanLine} />

      <Card>
        <div className="relative mx-auto grid aspect-square w-full max-w-xs place-items-center overflow-hidden rounded-3xl bg-ink/90">
          {/* Scanner frame */}
          <div className="relative h-48 w-48">
            <span className="absolute right-0 top-0 h-8 w-8 rounded-tr-2xl border-r-4 border-t-4 border-primary" />
            <span className="absolute left-0 top-0 h-8 w-8 rounded-tl-2xl border-l-4 border-t-4 border-primary" />
            <span className="absolute bottom-0 right-0 h-8 w-8 rounded-br-2xl border-b-4 border-r-4 border-accent" />
            <span className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-2xl border-b-4 border-l-4 border-accent" />
          </div>
          <p className="absolute bottom-4 text-xs text-white/70">
            وجّه الكاميرا نحو رمز QR
          </p>
        </div>
        <p className="mt-4 text-center text-sm text-ink-muted">
          سيتم تفعيل الكاميرا والمسح الفعلي في خطوة قادمة.
        </p>
      </Card>
    </div>
  );
}
