import { Database, Search, Plus } from "lucide-react";
import { PageHero, Card, ComingSoon } from "@/components/ui/page-card";

export default function DataPage() {
  return (
    <div>
      <PageHero title="البيانات" subtitle="إدارة بيانات المخدومين" icon={Database} />

      <Card className="mb-3">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-2xl bg-surface-muted px-3 py-2.5">
            <Search className="h-4 w-4 text-ink-muted" />
            <input
              placeholder="بحث بالاسم أو الرقم..."
              className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
            />
          </div>
          <button className="grid h-11 w-11 place-items-center rounded-2xl btn-gradient text-white shadow-soft active:scale-95">
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </Card>

      <ComingSoon note="هنا سنعرض قائمة المخدومين مع إمكانية الإضافة والتعديل والحذف حسب الصلاحيات." />
    </div>
  );
}
