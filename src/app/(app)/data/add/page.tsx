"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronRight, UserPlus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ClassRow, classDisplayName } from "@/lib/data/types";
import { AddSingle } from "@/components/members/add-single";
import { AddBulk } from "@/components/members/add-bulk";

export default function AddMemberPage() {
  const [tab, setTab] = useState<"single" | "bulk">("single");
  const [classes, setClasses] = useState<ClassRow[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("classes")
      .select("*")
      .order("created_at", { ascending: true })
      .then(({ data }) => setClasses((data as ClassRow[]) ?? []));
  }, []);

  const classOptions = classes.map((c) => ({ id: c.id, name: classDisplayName(c) }));

  return (
    <div>
      <div className="animate-fade-up mb-4 flex items-center gap-3">
        <Link
          href="/data"
          className="grid h-10 w-10 place-items-center rounded-2xl bg-surface text-ink shadow-card active:scale-95"
        >
          <ChevronRight className="h-5 w-5" />
        </Link>
        <h2 className="text-lg font-bold text-ink">إضافة مخدوم</h2>
      </div>

      {/* Tabs: single / bulk */}
      <div className="animate-fade-up mb-4 flex rounded-2xl bg-surface-muted p-1">
        <button
          onClick={() => setTab("single")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold transition ${
            tab === "single" ? "btn-gradient text-white shadow-soft" : "text-ink-muted"
          }`}
        >
          <UserPlus className="h-4 w-4" /> مخدوم واحد
        </button>
        <button
          onClick={() => setTab("bulk")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold transition ${
            tab === "bulk" ? "btn-gradient text-white shadow-soft" : "text-ink-muted"
          }`}
        >
          <Users className="h-4 w-4" /> عدد كبير
        </button>
      </div>

      {tab === "single" ? (
        <AddSingle classes={classOptions} />
      ) : (
        <AddBulk classes={classOptions} />
      )}
    </div>
  );
}
