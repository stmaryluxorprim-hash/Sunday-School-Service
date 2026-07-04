"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Send, Loader2 } from "lucide-react";
import type { MemberMessage } from "@/lib/member/portal";
import { formatTime } from "@/lib/messaging/types";
import {
  sendMessageAction,
  refreshMessagesAction,
} from "@/app/member/(portal)/messages/actions";

/**
 * شات المخدوم — رسائله على اليمين (btn-gradient) ورسائل الخدّام على اليسار.
 * يحدَّث دورياً كل 10 ثوانٍ (المخدوم بلا جلسة Supabase فلا Realtime هنا).
 */
export function MemberChat({ initialMessages }: { initialMessages: MemberMessage[] }) {
  const [messages, setMessages] = useState<MemberMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  // تمرير لآخر رسالة
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  // تحديث دوري
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const fresh = await refreshMessagesAction();
        if (fresh.length) setMessages(fresh);
      } catch {
        /* ignore */
      }
    }, 10000);
    return () => clearInterval(t);
  }, []);

  const send = () => {
    const text = draft.trim();
    if (!text || pending) return;
    setError(null);
    startTransition(async () => {
      const res = await sendMessageAction(text);
      if (res.ok && res.message) {
        setMessages((prev) => [...prev, res.message!]);
        setDraft("");
      } else {
        setError(res.error || "تعذّر الإرسال.");
      }
    });
  };

  return (
    <div className="animate-fade-up flex h-[calc(100vh-240px)] min-h-[320px] flex-col rounded-xl border border-white/40 bg-surface shadow-card">
      {/* Messages */}
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-muted">
            لا توجد رسائل بعد — اكتب رسالتك الأولى للخدّام 👇
          </p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.from_member ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 shadow-soft ${
                  m.from_member
                    ? "btn-gradient text-white"
                    : "bg-surface-muted text-ink"
                }`}
              >
                {!m.from_member && (
                  <p className="mb-0.5 text-[10px] font-bold opacity-70">
                    {m.sender_name || "خادم"}
                  </p>
                )}
                <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>
                <p
                  className={`mt-0.5 text-[10px] ${
                    m.from_member ? "text-white/70" : "text-ink-muted"
                  }`}
                >
                  {formatTime(m.created_at)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <p className="px-3 pb-1 text-xs font-semibold text-accent">{error}</p>
      )}

      {/* Composer */}
      <div className="flex items-end gap-2 border-t border-white/40 p-2.5">
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
          placeholder="اكتب رسالتك..."
          className="max-h-28 flex-1 resize-none rounded-2xl border border-primary-soft bg-surface px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-primary"
        />
        <button
          onClick={send}
          disabled={pending || !draft.trim()}
          aria-label="إرسال"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl btn-gradient text-white shadow-soft transition active:scale-95 disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5 -scale-x-100" />
          )}
        </button>
      </div>
    </div>
  );
}
