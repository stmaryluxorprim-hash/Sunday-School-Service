"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Database, Search, Plus, Loader2, User } from "lucide-react";
import { PageHero } from "@/components/ui/page-card";
import { createClient } from "@/lib/supabase/client";
import { MemberRow } from "@/lib/data/types";

export default function DataPage() {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("members")
      .select("*")
      .order("created_at", { ascending: false });
    setMembers((data as MemberRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const supabase = createClient();
    const channel = supabase
      .channel("members_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "members" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const filtered = members.filter((m) => {
    if (!q.trim()) return true;
    const hay = `${m.full_name ?? ""} ${m.code} ${m.phone ?? ""}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

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
      ) : filtered.length === 0 ? (
        <div className="animate-fade-up rounded-3xl bg-surface p-8 text-center shadow-card border border-white/40">
          <User className="mx-auto mb-2 h-10 w-10 text-primary" />
          <p className="text-sm font-semibold text-ink">
            {members.length === 0 ? "لا يوجد مخدومين بعد" : "لا نتائج للبحث"}
          </p>
          {members.length === 0 && (
            <p className="mt-1 text-xs text-ink-muted">اضغط + لإضافة مخدوم</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="px-1 text-xs text-ink-muted">{filtered.length} مخدوم</p>
          {filtered.map((m) => (
            <div
              key={m.id}
              className="animate-fade-up flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-card border border-white/40"
            >
              <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full btn-gradient text-white">
                {m.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.photo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-6 w-6" />
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
          ))}
        </div>
      )}
    </div>
  );
}
