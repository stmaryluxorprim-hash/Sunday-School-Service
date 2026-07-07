"use client";

/**
 * صفحة الرسائل الداخلية — كانت مودالاً (MessagingApp) وأصبحت صفحة كاملة.
 * تُفتح من القائمة الجانبية فقط (وليست في الشريط السفلي).
 *
 * تدعم فتح محادثة مخدوم مباشرة عبر باراميترات الرابط:
 *   /messages?member=<id>&name=<الاسم>
 */

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Send,
  ArrowRight,
  MessageCircle,
  Loader2,
  Trash2,
  UserCircle2,
} from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { PageHero, Card } from "@/components/ui/page-card";
import {
  ConversationRow,
  MessageRow,
  formatWhen,
  formatTime,
} from "@/lib/messaging/types";
import {
  listConversations,
  listMessages,
  createConversation,
  getOrCreateMemberConversation,
  sendMessage,
  deleteConversation,
} from "@/lib/messaging/operations";

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <Card className="grid place-items-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </Card>
      }
    >
      <MessagesInner />
    </Suspense>
  );
}

function MessagesInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [meId, setMeId] = useState<string | null>(null);
  const [myName, setMyName] = useState("مستخدم");

  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [active, setActive] = useState<ConversationRow | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // بيانات المستخدم الحالي
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setMeId(user.id);
        setMyName(
          (user.user_metadata?.full_name as string | undefined) ??
            user.email?.split("@")[0] ??
            "مستخدم"
        );
      }
    });
  }, []);

  const loadConversations = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    const rows = await listConversations();
    setConversations(rows);
    setLoading(false);
  }, []);

  // تحميل المحادثات + الاشتراك في التحديثات
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    loadConversations();
    const supabase = createClient();
    const channel = supabase
      .channel("messaging_conversations_page")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => loadConversations()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadConversations]);

  // فتح محادثة مخدوم عبر باراميترات الرابط (?member=&name=)
  const openedMemberRef = useRef<string | null>(null);
  useEffect(() => {
    const memberId = searchParams.get("member");
    if (!memberId || !isSupabaseConfigured) return;
    if (openedMemberRef.current === memberId) return;
    openedMemberRef.current = memberId;
    const memberName = searchParams.get("name") ?? "";
    (async () => {
      const conv = await getOrCreateMemberConversation(
        memberId,
        memberName ? `محادثة: ${memberName}` : undefined
      );
      if (conv) {
        await loadConversations();
        setActive(conv);
      }
      // تنظيف الرابط حتى لا تُعاد الفتح عند التنقّل
      router.replace("/messages");
    })();
  }, [searchParams, loadConversations, router]);

  // تحميل رسائل المحادثة النشطة + الاشتراك
  useEffect(() => {
    if (!active || !isSupabaseConfigured) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    listMessages(active.id).then((rows) => {
      if (!cancelled) setMessages(rows);
    });
    const supabase = createClient();
    const channel = supabase
      .channel(`messaging_thread_page_${active.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${active.id}`,
        },
        (payload) => {
          setMessages((prev) => {
            const m = payload.new as MessageRow;
            if (prev.some((x) => x.id === m.id)) return prev;
            return [...prev, m];
          });
        }
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [active]);

  // scroll لأسفل عند وصول رسائل جديدة
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, active]);

  const send = async () => {
    if (!active || !draft.trim() || sending) return;
    setSending(true);
    const text = draft.trim();
    setDraft("");
    const msg = await sendMessage(active.id, text, myName);
    if (msg) {
      setMessages((prev) =>
        prev.some((x) => x.id === msg.id) ? prev : [...prev, msg]
      );
    }
    setSending(false);
  };

  const createNew = async () => {
    if (!newTitle.trim()) return;
    setCreating(false);
    const conv = await createConversation(newTitle.trim());
    setNewTitle("");
    if (conv) {
      await loadConversations();
      setActive(conv);
    }
  };

  const removeConversation = async (id: string) => {
    const ok = await deleteConversation(id);
    if (ok) {
      if (active?.id === id) setActive(null);
      loadConversations();
    }
  };

  const filtered = conversations.filter((c) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return (
      (c.title ?? "").toLowerCase().includes(needle) ||
      (c.last_message ?? "").toLowerCase().includes(needle)
    );
  });

  return (
    <div>
      <PageHero
        title="الرسائل الداخلية"
        subtitle="محادثات الخدّام داخل الخدمة"
        icon={MessageCircle}
        grad="grad-primary"
      />

      {!isSupabaseConfigured ? (
        <Card className="py-10 text-center text-sm text-ink-muted">
          يجب إعداد Supabase لتفعيل الرسائل الداخلية.
        </Card>
      ) : active ? (
        /* ============ عرض المحادثة (شات) ============ */
        <Card className="flex h-[calc(100vh-15rem)] flex-col overflow-hidden !p-0 lg:h-[calc(100vh-14rem)]">
          {/* رأس المحادثة */}
          <div className="glass flex items-center gap-3 border-b border-white/20 px-4 py-3">
            <button
              onClick={() => setActive(null)}
              className="grid h-10 w-10 place-items-center rounded-2xl bg-surface text-ink shadow-card active:scale-95"
              aria-label="رجوع"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-base font-bold text-ink">
                {active.title || "محادثة"}
              </h2>
            </div>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto bg-surface-muted/40 p-4">
            {messages.length === 0 ? (
              <div className="grid h-full place-items-center text-center text-sm text-ink-muted">
                ابدأ المحادثة بإرسال رسالة
              </div>
            ) : (
              messages.map((m) => {
                const mine = meId && m.sender_id === meId;
                return (
                  <div
                    key={m.id}
                    className={`flex ${mine ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[78%] rounded-2xl px-3.5 py-2 shadow-soft ${
                        mine
                          ? "btn-gradient text-white"
                          : "bg-surface text-ink border border-white/40"
                      }`}
                    >
                      {!mine && (
                        <p className="mb-0.5 text-[10px] font-bold opacity-70">
                          {m.sender_name || "مستخدم"}
                        </p>
                      )}
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                        {m.body}
                      </p>
                      <p
                        className={`mt-0.5 text-[10px] ${
                          mine ? "text-white/70" : "text-ink-muted"
                        }`}
                        dir="ltr"
                      >
                        {formatTime(m.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* صندوق الإدخال */}
          <div className="border-t border-white/20 bg-surface p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                placeholder="اكتب رسالة..."
                className="max-h-28 flex-1 resize-none rounded-2xl border border-primary-soft bg-surface-muted px-4 py-2.5 text-sm text-ink outline-none focus:border-primary"
              />
              <button
                onClick={send}
                disabled={!draft.trim() || sending}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl btn-gradient text-white shadow-soft active:scale-95 disabled:opacity-50"
                aria-label="إرسال"
              >
                {sending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </Card>
      ) : (
        /* ============ قائمة المحادثات ============ */
        <Card className="!p-0 overflow-hidden">
          {/* بحث + محادثة جديدة */}
          <div className="border-b border-white/10 bg-surface p-3">
            <div className="flex items-center gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-2xl bg-surface-muted px-3 py-2.5">
                <Search className="h-4 w-4 text-ink-muted" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="بحث في المحادثات..."
                  className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
                />
              </div>
              <button
                onClick={() => setCreating((v) => !v)}
                className="grid h-11 w-11 place-items-center rounded-2xl btn-gradient text-white shadow-soft active:scale-95"
                aria-label="محادثة جديدة"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            {creating && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createNew()}
                  autoFocus
                  placeholder="عنوان المحادثة الجديدة"
                  className="flex-1 rounded-2xl border border-primary-soft bg-surface-muted px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
                />
                <button
                  onClick={createNew}
                  disabled={!newTitle.trim()}
                  className="rounded-2xl btn-gradient px-4 py-2.5 text-sm font-bold text-white shadow-soft active:scale-95 disabled:opacity-50"
                >
                  إنشاء
                </button>
              </div>
            )}
          </div>

          <div className="max-h-[calc(100vh-20rem)] overflow-y-auto p-3">
            {loading ? (
              <div className="grid place-items-center py-16 text-ink-muted">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="grid place-items-center py-16 text-center text-ink-muted">
                <MessageCircle className="mb-2 h-10 w-10 text-primary" />
                <p className="text-sm font-semibold text-ink">لا توجد محادثات</p>
                <p className="mt-1 text-xs">اضغط + لبدء محادثة جديدة</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((c) => (
                  <div
                    key={c.id}
                    className="group flex items-center gap-3 rounded-2xl bg-surface-muted p-2.5"
                  >
                    <button
                      onClick={() => setActive(c)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-right active:scale-[0.99]"
                    >
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full btn-gradient text-white">
                        <UserCircle2 className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate font-bold text-ink">
                            {c.title || "محادثة"}
                          </p>
                          <span className="shrink-0 text-[10px] text-ink-muted" dir="ltr">
                            {formatWhen(c.last_at)}
                          </span>
                        </div>
                        <p className="truncate text-xs text-ink-muted">
                          {c.last_message || "لا رسائل بعد"}
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => removeConversation(c.id)}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-surface text-rose-500 opacity-0 transition group-hover:opacity-100 active:scale-95"
                      aria-label="حذف المحادثة"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
