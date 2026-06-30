"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Database,
  Search,
  Plus,
  Loader2,
  User,
  GraduationCap,
  ChevronDown,
} from "lucide-react";
import { PageHero } from "@/components/ui/page-card";
import { createClient } from "@/lib/supabase/client";
import { MemberRow, ClassRow, classDisplayName } from "@/lib/data/types";

type Group = {
  cls: ClassRow | null; // null = members with no class
  members: MemberRow[];
};

export default function DataPage() {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: mData }, { data: cData }] = await Promise.all([
      supabase.from("members").select("*").order("created_at", { ascending: false }),
      supabase.from("classes").select("*").order("created_at", { ascending: true }),
    ]);
    setMembers((mData as MemberRow[]) ?? []);
    setClasses((cData as ClassRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const supabase = createClient();
    const channel = supabase
      .channel("data_page_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "members" },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "classes" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const filtered = useMemo(() => {
    if (!q.trim()) return members;
    const needle = q.toLowerCase();
    return members.filter((m) => {
      const hay = `${m.full_name ?? ""} ${m.code} ${m.phone ?? ""}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [members, q]);

  // Group members under each class (in class order), plus a trailing "no class" group.
  const groups = useMemo<Group[]>(() => {
    const byClass = new Map<string, MemberRow[]>();
    const noClass: MemberRow[] = [];
    for (const m of filtered) {
      if (m.class_id) {
        const arr = byClass.get(m.class_id) ?? [];
        arr.push(m);
        byClass.set(m.class_id, arr);
      } else {
        noClass.push(m);
      }
    }
    const result: Group[] = classes.map((c) => ({
      cls: c,
      members: byClass.get(c.id) ?? [],
    }));
    if (noClass.length > 0) result.push({ cls: null, members: noClass });
    return result;
  }, [filtered, classes]);

  const toggle = (key: string) =>
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div>
      <PageHero title="البيانات" subtitle="إدارة بيانات المخدومين" icon={Database} />

      <div className="animate-fade-up mb-3 rounded-3xl bg-surface p-3 shadow-card border border-white/40">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-2xl bg-surface-muted px-3 py-2.5">
            <Search className="h-4 w-4 text-ink-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="بحث بالاسم أو الكود أو التليفون..."
              className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
            />
          </div>
          <Link
            href="/data/add"
            className="grid h-11 w-11 place-items-center rounded-2xl btn-gradient text-white shadow-soft active:scale-95"
          >
            <Plus className="h-5 w-5" />
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="grid place-items-center py-16 text-ink-muted">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : members.length === 0 ? (
        <div className="animate-fade-up rounded-3xl bg-surface p-8 text-center shadow-card border border-white/40">
          <User className="mx-auto mb-2 h-10 w-10 text-primary" />
          <p className="text-sm font-semibold text-ink">لا يوجد مخدومين بعد</p>
          <p className="mt-1 text-xs text-ink-muted">اضغط + لإضافة مخدوم</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="animate-fade-up rounded-3xl bg-surface p-8 text-center shadow-card border border-white/40">
          <Search className="mx-auto mb-2 h-10 w-10 text-primary" />
          <p className="text-sm font-semibold text-ink">لا نتائج للبحث</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => {
            const key = g.cls?.id ?? "__none__";
            const title = g.cls ? classDisplayName(g.cls) : "بدون فصل";
            const primary = g.cls?.color_primary ?? "#6d5dfc";
            const accent = g.cls?.color_accent ?? "#f15bb5";
            const isCollapsed = collapsed[key];
            // Hide empty class sections when searching to reduce noise,
            // but always show them otherwise so the structure is visible.
            if (g.members.length === 0 && q.trim()) return null;
            return (
              <section
                key={key}
                className="animate-fade-up overflow-hidden rounded-3xl bg-surface shadow-card border border-white/40"
              >
                {/* class header */}
                <button
                  onClick={() => toggle(key)}
                  className="flex w-full items-center gap-3 p-3 text-right active:scale-[0.99]"
                >
                  <div
                    className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl text-white shadow-soft"
                    style={{ background: `linear-gradient(100deg, ${primary}, ${accent})` }}
                  >
                    {g.cls?.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={g.cls.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <GraduationCap className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-ink">{title}</p>
                    <p className="text-xs text-ink-muted">{g.members.length} مخدوم</p>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 text-ink-muted transition-transform ${
                      isCollapsed ? "-rotate-90" : ""
                    }`}
                  />
                </button>

                {/* members in this class */}
                {!isCollapsed && (
                  <div className="space-y-2 px-3 pb-3">
                    {g.members.length === 0 ? (
                      <p className="rounded-2xl bg-surface-muted px-3 py-3 text-center text-xs text-ink-muted">
                        لا يوجد مخدومين في هذا الفصل
                      </p>
                    ) : (
                      g.members.map((m) => <MemberItem key={m.id} m={m} />)
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MemberItem({ m }: { m: MemberRow }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface-muted p-2.5">
      <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full btn-gradient text-white">
        {m.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.photo_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <User className="h-5 w-5" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-ink">{m.full_name || "—"}</p>
        <p className="truncate text-xs text-ink-muted" dir="ltr">
          {m.phone ? `+2${m.phone}` : m.code}
        </p>
      </div>
      <span
        className={`rounded-lg px-2 py-1 text-[10px] font-bold ${
          m.gender === "male" ? "bg-primary-soft text-primary" : "bg-accent-soft text-accent"
        }`}
      >
        {m.gender === "male" ? "ذكر" : "أنثى"}
      </span>
    </div>
  );
}
