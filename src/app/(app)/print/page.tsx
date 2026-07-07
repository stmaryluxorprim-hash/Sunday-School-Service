"use client";

/**
 * صفحة طباعة البطاقات — كل مزايا الطباعة:
 * تصميم البطاقة (حجم/وضع/عناصر/ألوان/هامش أمان) + بروفايلات محفوظة مرتبطة
 * بالفصول + طباعة فردية + طباعة جماعية على A4 بكل خيارات الشبكة.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Printer,
  CreditCard,
  Layers,
  Palette,
  Search,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSettings } from "@/context/settings-context";
import { PageHero, Card } from "@/components/ui/page-card";
import type { MemberRow, ClassRow } from "@/lib/data/types";
import {
  CardPrintOptions,
  CardProfileRow,
  CardTheme,
  CUSTOM_THEME,
  DEFAULT_CARD_OPTS,
  loadCardPrintOptions,
  saveCardPrintOptions,
  profileToTheme,
  profileToOverrides,
  PrintMode,
} from "@/lib/print/types";
import type { CardMember, CardService } from "@/lib/print/card-builder";
import {
  printSingleCard,
  printBulkCards,
  BulkItem,
} from "@/lib/print/print-engine";
import {
  loadCardProfiles,
  saveCardProfile,
  deleteCardProfile,
  setClassDefaultProfile,
} from "@/lib/print/profiles";
import { CardPreview } from "@/components/print/card-preview";
import { OptionsPanel } from "@/components/print/options-panel";
import { ProfilesPanel } from "@/components/print/profiles-panel";
import { BulkPanel } from "@/components/print/bulk-panel";

type Tab = "design" | "bulk";

export default function PrintPage() {
  const supabase = useMemo(() => createClient(), []);
  const { branding } = useSettings();

  // ------- البيانات -------
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [profiles, setProfiles] = useState<CardProfileRow[]>([]);
  const [loading, setLoading] = useState(true);

  // ------- الخيارات (محفوظة محلياً) -------
  const [opts, setOpts] = useState<CardPrintOptions>(DEFAULT_CARD_OPTS);
  const optsLoaded = useRef(false);

  // ------- الثيم النشط -------
  const [activeThemeId, setActiveThemeId] = useState<string>("__custom__");
  const [customTheme, setCustomTheme] = useState<CardTheme>(CUSTOM_THEME);

  // ------- واجهة -------
  const [tab, setTab] = useState<Tab>("design");
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  // تحميل الخيارات من localStorage عند البدء
  useEffect(() => {
    setOpts(loadCardPrintOptions());
    optsLoaded.current = true;
  }, []);

  // حفظ تلقائي عند أي تغيير
  useEffect(() => {
    if (optsLoaded.current) saveCardPrintOptions(opts);
  }, [opts]);

  // toast auto-hide
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // تحميل البيانات من Supabase
  const loadData = useCallback(async () => {
    setLoading(true);
    const [mRes, cRes, pList] = await Promise.all([
      supabase.from("members").select("*").order("name"),
      supabase.from("classes").select("*").order("name"),
      loadCardProfiles(),
    ]);
    setMembers((mRes.data as MemberRow[]) ?? []);
    setClasses((cRes.data as ClassRow[]) ?? []);
    setProfiles(pList);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ------- مشتقات -------
  const service: CardService = useMemo(
    () => ({ serviceName: branding.serviceName, logoUrl: branding.logoUrl }),
    [branding.serviceName, branding.logoUrl]
  );

  const classNameById = useMemo(() => {
    const m = new Map<string, string>();
    classes.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [classes]);

  const profileById = useMemo(() => {
    const m = new Map<string, CardProfileRow>();
    profiles.forEach((p) => m.set(p.id, p));
    return m;
  }, [profiles]);

  const activeProfile = activeThemeId !== "__custom__" ? profileById.get(activeThemeId) : undefined;
  const activeTheme: CardTheme = activeProfile ? profileToTheme(activeProfile) : customTheme;
  const activeOverrides = activeProfile ? profileToOverrides(activeProfile) : {};

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) => m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q)
    );
  }, [members, memberSearch]);

  const selectedMember = members.find((m) => m.id === selectedMemberId) ?? null;

  const toCardMember = useCallback(
    (m: MemberRow): CardMember => ({
      id: m.id,
      code: m.code,
      name: m.name,
      photo_url: m.photo_url,
      className: m.class_id ? classNameById.get(m.class_id) ?? "" : "",
    }),
    [classNameById]
  );

  /** حلّ ثيم/overrides لمخدوم حسب بروفايل فصله الافتراضي (وإلا الثيم النشط). */
  const resolveMemberTheme = useCallback(
    (m: MemberRow): { theme: CardTheme; overrides: Partial<CardPrintOptions> } => {
      if (m.class_id) {
        const cls = classes.find((c) => c.id === m.class_id);
        const pid = cls?.default_card_profile_id;
        if (pid) {
          const p = profileById.get(pid);
          if (p) return { theme: profileToTheme(p), overrides: profileToOverrides(p) };
        }
      }
      return { theme: activeTheme, overrides: activeOverrides };
    },
    [classes, profileById, activeTheme, activeOverrides]
  );

  // ------- أفعال -------
  const patchOpts = useCallback(
    (patch: Partial<CardPrintOptions>) => setOpts((o) => ({ ...o, ...patch })),
    []
  );

  const handleSingle = async () => {
    if (!selectedMember) {
      setToast({ ok: false, text: "اختر مخدوماً أولاً" });
      return;
    }
    const { theme, overrides } = resolveMemberTheme(selectedMember);
    const res = await printSingleCard(
      toCardMember(selectedMember),
      theme,
      service,
      opts,
      overrides
    );
    setToast({ ok: res.ok, text: res.message });
  };

  const handleBulk = async (list: MemberRow[], printSide: PrintMode) => {
    if (!list.length) return;
    setPrinting(true);
    setProgress({ done: 0, total: list.length });
    const items: BulkItem[] = list.map((m) => {
      const { theme, overrides } = resolveMemberTheme(m);
      return { member: toCardMember(m), theme, overrides };
    });
    const res = await printBulkCards(items, service, opts, printSide, activeTheme, (d, t) =>
      setProgress({ done: d, total: t })
    );
    setPrinting(false);
    setProgress(null);
    setToast({ ok: res.ok, text: res.message });
  };

  const handleSaveProfile = async (name: string, icon: string): Promise<boolean> => {
    setSavingProfile(true);
    const res = await saveCardProfile(
      name,
      icon,
      activeTheme,
      opts,
      !!opts.headerColor,
      !!opts.footerColor,
      opts.headerColor,
      opts.footerColor
    );
    setSavingProfile(false);
    if (res.ok && res.profile) {
      setProfiles((prev) => [...prev, res.profile!]);
      setActiveThemeId(res.profile.id);
      setToast({ ok: true, text: "تم حفظ البروفايل" });
      return true;
    }
    setToast({ ok: false, text: res.message ?? "تعذّر الحفظ" });
    return false;
  };

  const handleDeleteProfile = async (id: string) => {
    const res = await deleteCardProfile(id);
    if (res.ok) {
      setProfiles((prev) => prev.filter((p) => p.id !== id));
      if (activeThemeId === id) setActiveThemeId("__custom__");
      // فكّ ربط الفصول محلياً
      setClasses((prev) =>
        prev.map((c) =>
          c.default_card_profile_id === id ? { ...c, default_card_profile_id: null } : c
        )
      );
    }
    setToast({ ok: res.ok, text: res.message });
  };

  const handleLinkClass = async (classId: string, profileId: string | null) => {
    const res = await setClassDefaultProfile(classId, profileId);
    if (res.ok) {
      setClasses((prev) =>
        prev.map((c) =>
          c.id === classId ? { ...c, default_card_profile_id: profileId } : c
        )
      );
    }
    setToast({ ok: res.ok, text: res.message });
  };

  const handleSelectProfile = (p: CardProfileRow) => {
    setActiveThemeId(p.id);
    // تطبيق إعدادات البروفايل على الخيارات (بدون safeMargin — عالمي)
    const ov = profileToOverrides(p);
    setOpts((o) => ({ ...o, ...ov }));
  };

  const handleApplyCustom = () => setActiveThemeId("__custom__");

  const tabBtn = (t: Tab, label: string, Icon: typeof CreditCard) => (
    <button
      type="button"
      onClick={() => setTab(t)}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
        tab === t
          ? "btn-gradient text-white shadow-soft"
          : "bg-surface text-ink-muted hover:bg-surface-muted border border-border"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );

  return (
    <div className="space-y-4 pb-8">
      <PageHero
        title="طباعة البطاقات"
        subtitle="تصميم وطباعة بطاقات المخدومين — فردي أو جماعي على A4"
        icon={Printer}
        grad="grad-green"
      />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-card ${
            toast.ok ? "bg-emerald-600" : "bg-rose-600"
          }`}
        >
          {toast.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {tabBtn("design", "تصميم وطباعة فردية", CreditCard)}
        {tabBtn("bulk", "طباعة جماعية A4", Layers)}
      </div>

      {loading ? (
        <Card className="flex items-center justify-center gap-2 py-10 text-sm text-ink-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
          جاري تحميل البيانات…
        </Card>
      ) : tab === "design" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* اختيار مخدوم + معاينة + طباعة */}
          <div className="space-y-4">
            <Card>
              <div className="mb-2 flex items-center gap-1.5 text-sm font-bold text-ink">
                <Search className="h-4 w-4 text-ink-muted" />
                اختر مخدوماً للمعاينة والطباعة
              </div>
              <input
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="بحث بالاسم أو الكود…"
                className="mb-2 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink"
              />
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink"
              >
                <option value="">— اختر —</option>
                {filteredMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.code})
                  </option>
                ))}
              </select>
            </Card>

            <Card>
              <div className="mb-2 text-sm font-bold text-ink">👁️ معاينة حيّة</div>
              {selectedMember ? (
                <CardPreview
                  member={toCardMember(selectedMember)}
                  theme={resolveMemberTheme(selectedMember).theme}
                  service={service}
                  opts={opts}
                  overrides={resolveMemberTheme(selectedMember).overrides}
                />
              ) : (
                <div className="py-10 text-center text-sm text-ink-muted">
                  اختر مخدوماً لعرض المعاينة
                </div>
              )}
              <button
                type="button"
                disabled={!selectedMember}
                onClick={handleSingle}
                className="btn-gradient mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                <Printer className="h-4 w-4" />
                طباعة البطاقة
              </button>
            </Card>
          </div>

          {/* الخيارات + البروفايلات */}
          <div className="space-y-4">
            <Card>
              <OptionsPanel
                opts={opts}
                onChange={patchOpts}
                onReset={() => setOpts({ ...DEFAULT_CARD_OPTS })}
              />
            </Card>
            <Card>
              <div className="mb-3 flex items-center gap-1.5 text-sm font-bold text-ink">
                <Palette className="h-4 w-4 text-ink-muted" />
                البروفايلات والثيمات
              </div>
              <ProfilesPanel
                profiles={profiles}
                activeThemeId={activeThemeId}
                customTheme={customTheme}
                classes={classes}
                onSelectProfile={handleSelectProfile}
                onApplyCustom={handleApplyCustom}
                onCustomChange={(patch) => setCustomTheme((t) => ({ ...t, ...patch }))}
                onSaveProfile={handleSaveProfile}
                onDeleteProfile={handleDeleteProfile}
                onLinkClass={handleLinkClass}
                saving={savingProfile}
              />
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <BulkPanel
              members={members}
              classes={classes}
              opts={opts}
              onChange={patchOpts}
              onPrint={handleBulk}
              printing={printing}
              progress={progress}
            />
          </Card>
          <Card>
            <div className="mb-2 text-sm font-bold text-ink">👁️ معاينة التصميم الحالي</div>
            {members.length > 0 ? (
              <CardPreview
                member={toCardMember(selectedMember ?? members[0])}
                theme={
                  resolveMemberTheme(selectedMember ?? members[0]).theme
                }
                service={service}
                opts={opts}
                overrides={resolveMemberTheme(selectedMember ?? members[0]).overrides}
              />
            ) : (
              <div className="py-10 text-center text-sm text-ink-muted">
                لا يوجد مخدومون بعد
              </div>
            )}
            <p className="mt-3 text-xs leading-relaxed text-ink-muted">
              💡 المخدومون الذين لفصلهم بروفايل افتراضي سيُطبعون بألوان بروفايل
              فصلهم تلقائياً. الباقون يُطبعون بالثيم النشط الحالي.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
