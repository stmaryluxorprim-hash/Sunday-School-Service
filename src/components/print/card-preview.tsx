"use client";

/**
 * معاينة حيّة للبطاقة — تبني HTML البطاقة بنفس محرك الطباعة وتعرضه
 * مصغّراً داخل الصفحة (مع إزالة قواعد @media print حتى لا تؤثر على التطبيق).
 */

import { useEffect, useMemo, useState } from "react";
import {
  buildCardHTML,
  CardMember,
  CardService,
} from "@/lib/print/card-builder";
import { cardStyles } from "@/lib/print/card-styles";
import { generateQRDataUrl } from "@/lib/print/print-engine";
import { CardPrintOptions, CardTheme } from "@/lib/print/types";

export function CardPreview({
  member,
  theme,
  service,
  opts,
  overrides = {},
}: {
  member: CardMember | null;
  theme: CardTheme;
  service: CardService;
  opts: CardPrintOptions;
  overrides?: Partial<CardPrintOptions>;
}) {
  const [qrUrl, setQrUrl] = useState<string>("");

  useEffect(() => {
    let alive = true;
    if (!member) {
      setQrUrl("");
      return;
    }
    generateQRDataUrl(member.code).then((u) => alive && setQrUrl(u));
    return () => {
      alive = false;
    };
  }, [member]);

  // أنماط البطاقة بدون قواعد الطباعة والـ body (لا تؤثر على التطبيق)
  const previewStyles = useMemo(
    () =>
      cardStyles()
        .replace(/@media print[^{]*\{[^@]*\}/g, "")
        .replace(/body\s*\{[^}]*\}/g, "")
        .replace(/\.print-actions[^}]*\}/g, ""),
    []
  );

  const html = useMemo(() => {
    if (!member) return "";
    return buildCardHTML(member, theme, service, opts, {
      qrDataUrl: qrUrl,
      overrides,
    });
  }, [member, theme, service, opts, overrides, qrUrl]);

  const merged = { ...opts, ...overrides };
  const isSingle = merged.mode === "front" || merged.mode === "back";
  // ارتفاع الحاوية حسب الوضع والحجم (مع مقياس 0.62)
  const baseH = merged.cardSize === "CR80" ? (isSingle ? 54 : 108) : isSingle ? 74 : 148;
  const scale = 0.62;
  const containerH = Math.ceil(baseH * 3.7795 * scale) + 16; // mm → px

  if (!member) {
    return (
      <div className="grid h-40 place-items-center rounded-xl bg-surface-muted text-sm text-ink-muted">
        اختر مخدوماً لعرض المعاينة
      </div>
    );
  }

  return (
    <div className="overflow-hidden text-center" dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: previewStyles }} />
      <div style={{ height: containerH }}>
        <div
          style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}
