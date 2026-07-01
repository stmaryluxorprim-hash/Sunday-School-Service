"use client";

import { Phone, MessageSquare, X, PhoneOff } from "lucide-react";
import { MemberRow } from "@/lib/data/types";
import { telLink, smsLink, whatsappLink, hasPhone } from "@/lib/data/contact";

/** أيقونة واتساب بسيطة (SVG) — تجنّباً لإضافة اعتمادية جديدة. */
function WhatsAppIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.13h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.42-.14 0-.31-.02-.47-.02-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29z" />
    </svg>
  );
}

export function ContactSheet({
  member,
  onClose,
  onInternalMessage,
}: {
  member: MemberRow | null;
  onClose: () => void;
  /** فتح محادثة داخلية مع هذا المخدوم داخل تطبيق الرسائل. */
  onInternalMessage: (m: MemberRow) => void;
}) {
  if (!member) return null;

  const phoneOk = hasPhone(member.phone);
  const greeting = `مرحباً ${member.name || ""}`.trim();

  const Item = ({
    icon,
    label,
    href,
    onClick,
    tone = "primary",
    disabled = false,
  }: {
    icon: React.ReactNode;
    label: string;
    href?: string;
    onClick?: () => void;
    tone?: "primary" | "accent" | "green";
    disabled?: boolean;
  }) => {
    const toneCls =
      tone === "green"
        ? "bg-emerald-500 text-white"
        : tone === "accent"
        ? "btn-gradient text-white"
        : "bg-primary-soft text-primary";
    const body = (
      <>
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${toneCls}`}
        >
          {icon}
        </span>
        <span className="text-sm font-bold text-ink">{label}</span>
      </>
    );
    const base =
      "flex items-center gap-3 rounded-2xl bg-surface-muted p-2.5 text-right active:scale-[0.98] transition w-full disabled:opacity-40";
    if (disabled)
      return (
        <button className={base} disabled>
          {body}
        </button>
      );
    if (href)
      return (
        <a href={href} className={base} onClick={onClose}>
          {body}
        </a>
      );
    return (
      <button className={base} onClick={onClick}>
        {body}
      </button>
    );
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-50">
        <div className="mx-auto max-w-md rounded-t-3xl bg-surface p-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] shadow-2xl">
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-surface-muted" />
          <div className="mb-4 flex items-center justify-between">
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold text-ink">
                التواصل مع {member.name || "—"}
              </h3>
              {member.phone && (
                <p className="text-xs text-ink-muted" dir="ltr">
                  {member.phone}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-xl bg-surface-muted text-ink active:scale-95"
              aria-label="إغلاق"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <Item
              icon={phoneOk ? <Phone className="h-5 w-5" /> : <PhoneOff className="h-5 w-5" />}
              label="اتصال"
              href={phoneOk ? telLink(member.phone) : undefined}
              disabled={!phoneOk}
            />
            <Item
              icon={<MessageSquare className="h-5 w-5" />}
              label="رسالة SMS"
              href={phoneOk ? smsLink(member.phone, greeting) : undefined}
              disabled={!phoneOk}
            />
            <Item
              icon={<WhatsAppIcon className="h-5 w-5" />}
              label="واتساب"
              tone="green"
              href={phoneOk ? whatsappLink(member.phone, greeting) : undefined}
              disabled={!phoneOk}
            />
            <Item
              icon={<MessageSquare className="h-5 w-5" />}
              label="رسالة داخلية"
              tone="accent"
              onClick={() => {
                onInternalMessage(member);
                onClose();
              }}
            />
          </div>

          {!phoneOk && (
            <p className="mt-3 text-center text-xs text-ink-muted">
              لا يوجد رقم تليفون لهذا المخدوم — يمكنك إرسال رسالة داخلية فقط.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
