/**
 * طباعة بطاقات الأصناف — بطاقة صنف تحتوي:
 *   الصورة + الاسم + السعر بالنقاط + كود QR الخاص بالصنف.
 *
 * وضعان للطباعة على A4:
 *   * 1 بطاقة كبيرة في الصفحة  (لعرض الهدية على الرف)
 *   * 4 بطاقات في الصفحة (2×2)  (لتوفير الورق)
 *
 * تُفتح نافذة جديدة وتُطبع تلقائياً بعد تحميل الصور
 * (نفس أسلوب محرك طباعة بطاقات المخدومين).
 */

import { generateQRDataUrl } from "@/lib/print/print-engine";
import type { StoreItemRow } from "./types";

export type LabelsPerPage = 1 | 4;

const FONTS_LINK =
  '<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">';

const AUTO_PRINT_SCRIPT =
  "<scr" +
  "ipt>" +
  'window.addEventListener("load",function(){' +
  "var imgs=Array.prototype.slice.call(document.images);" +
  "var pending=imgs.filter(function(i){return !i.complete;}).length;" +
  "function fire(){setTimeout(function(){window.focus();window.print();},400);}" +
  "if(pending===0){fire();return;}" +
  "imgs.forEach(function(i){" +
  "if(!i.complete){" +
  'i.addEventListener("load",function(){if(--pending<=0)fire();});' +
  'i.addEventListener("error",function(){if(--pending<=0)fire();});' +
  "}" +
  "});" +
  "});" +
  "</scr" +
  "ipt>";

/** HTML بطاقة صنف واحدة. */
function labelHTML(item: StoreItemRow, qrDataUrl: string, serviceName: string): string {
  const photo = item.photo_url
    ? `<img class="lbl-photo" src="${item.photo_url}" alt="">`
    : `<div class="lbl-photo lbl-photo-empty">🎁</div>`;
  return (
    '<div class="lbl">' +
    `<div class="lbl-head">${serviceName ? escapeHtml(serviceName) : "متجر الهدايا"}</div>` +
    photo +
    `<div class="lbl-name">${escapeHtml(item.name)}</div>` +
    `<div class="lbl-price"><span class="lbl-price-num">${Number(item.points_price)}</span><span class="lbl-price-unit">نقطة</span></div>` +
    `<img class="lbl-qr" src="${qrDataUrl}" alt="QR">` +
    `<div class="lbl-code">${escapeHtml(item.code)}</div>` +
    "</div>"
  );
}

function escapeHtml(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** CSS البطاقات حسب عدد البطاقات في الصفحة. */
function labelStyles(perPage: LabelsPerPage): string {
  // A4 = 210×297mm. وضع 1: بطاقة كبيرة بالمنتصف. وضع 4: شبكة 2×2.
  const big = perPage === 1;
  const cardW = big ? 150 : 96;
  const cardH = big ? 240 : 138;
  /** الصورة مربّعة (نفس صورة الرفع المربّعة 512×512) — عرض = ارتفاع. */
  const photoS = big ? 95 : 55;
  const nameFs = big ? 24 : 14;
  const priceFs = big ? 34 : 18;
  const qrSize = big ? 62 : 38;

  return (
    "@page { size: A4 portrait; margin: 0; }" +
    "*{box-sizing:border-box;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;}" +
    'html,body{margin:0;padding:0;font-family:"Cairo",sans-serif;}' +
    "@media screen{body{background:#e5e7eb;padding:20px 10px;}}" +
    ".page{width:210mm;height:296mm;margin:0 auto;background:#fff;display:grid;" +
    (big
      ? "grid-template-columns:1fr;grid-template-rows:1fr;place-items:center;"
      : "grid-template-columns:repeat(2,1fr);grid-template-rows:repeat(2,1fr);place-items:center;") +
    "page-break-after:always;break-after:page;overflow:hidden;}" +
    ".page:last-of-type{page-break-after:auto;break-after:auto;}" +
    "@media screen{.page{margin:16px auto;box-shadow:0 6px 24px rgba(0,0,0,0.25);}}" +
    `.lbl{width:${cardW}mm;height:${cardH}mm;border:0.4mm dashed #94a3b8;border-radius:4mm;` +
    "display:flex;flex-direction:column;align-items:center;padding:4mm;background:#fff;overflow:hidden;}" +
    `.lbl-head{font-size:${big ? 13 : 9}px;font-weight:700;color:#64748b;margin-bottom:2mm;}` +
    `.lbl-photo{width:${photoS}mm;height:${photoS}mm;object-fit:cover;border-radius:3mm;background:#f1f5f9;flex-shrink:0;}` +
    `.lbl-photo-empty{display:grid;place-items:center;font-size:${big ? 60 : 30}px;}` +
    `.lbl-name{font-size:${nameFs}px;font-weight:800;color:#0f172a;text-align:center;margin-top:2.5mm;line-height:1.3;` +
    "display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}" +
    `.lbl-price{display:flex;align-items:baseline;gap:1.5mm;margin-top:1.5mm;color:#d97706;}` +
    `.lbl-price-num{font-size:${priceFs}px;font-weight:900;}` +
    `.lbl-price-unit{font-size:${big ? 16 : 11}px;font-weight:700;}` +
    `.lbl-qr{width:${qrSize}mm;height:${qrSize}mm;margin-top:auto;}` +
    `.lbl-code{font-size:${big ? 10 : 7}px;color:#94a3b8;direction:ltr;margin-top:1mm;word-break:break-all;text-align:center;}` +
    ".print-actions{position:fixed;top:10px;left:10px;z-index:99;display:flex;gap:8px;}" +
    ".print-actions button{border:none;border-radius:10px;padding:10px 18px;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;background:#6366f1;color:#fff;box-shadow:0 4px 12px rgba(0,0,0,0.2);}" +
    ".print-actions button.alt{background:#334155;}" +
    "@media print{.print-actions{display:none !important;}}"
  );
}

export type LabelPrintJob = {
  item: StoreItemRow;
  /** عدد النسخ من بطاقة هذا الصنف. */
  copies: number;
};

/**
 * طباعة بطاقات أصناف — jobs = قائمة (صنف + عدد نسخ)،
 * perPage = 1 أو 4 بطاقة في صفحة A4.
 */
export async function printItemLabels(
  jobs: LabelPrintJob[],
  perPage: LabelsPerPage,
  serviceName = ""
): Promise<{ ok: boolean; message: string }> {
  const expanded = jobs.flatMap((j) =>
    Array.from({ length: Math.max(1, j.copies) }, () => j.item)
  );
  if (!expanded.length) return { ok: false, message: "لا توجد بطاقات للطباعة" };

  const w = window.open("", "_blank");
  if (!w) return { ok: false, message: "فعّل النوافذ المنبثقة للطباعة" };

  try {
    // QR واحد لكل صنف (كاش)
    const qrCache = new Map<string, string>();
    for (const item of expanded) {
      if (!qrCache.has(item.code)) {
        qrCache.set(item.code, await generateQRDataUrl(item.code));
      }
    }

    const cards = expanded.map((item) =>
      labelHTML(item, qrCache.get(item.code) || "", serviceName)
    );

    const pages: string[][] = [];
    for (let i = 0; i < cards.length; i += perPage)
      pages.push(cards.slice(i, i + perPage));

    const html =
      '<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8">' +
      `<title>بطاقات الأصناف (${expanded.length})</title>` +
      FONTS_LINK +
      `<style>${labelStyles(perPage)}</style>` +
      "</head><body>" +
      '<div class="print-actions">' +
      `<button onclick="window.print()">🖨️ طباعة (${pages.length} صفحة)</button>` +
      '<button class="alt" onclick="window.close()">✕ إغلاق</button>' +
      "</div>" +
      pages.map((p) => `<div class="page">${p.join("")}</div>`).join("") +
      AUTO_PRINT_SCRIPT +
      "</body></html>";

    w.document.write(html);
    w.document.close();
    return {
      ok: true,
      message: `تم تجهيز ${expanded.length} بطاقة / ${pages.length} صفحة`,
    };
  } catch (e) {
    try {
      w.close();
    } catch {
      /* ignore */
    }
    return { ok: false, message: "تعذّرت الطباعة: " + (e as Error).message };
  }
}
