/**
 * محرك الطباعة — فتح نافذة طباعة لبطاقة واحدة أو طباعة جماعية على A4.
 * منقول بكل ميزاته من نظام الطباعة المرجعي:
 *  - طباعة فردية: @page بحجم الورقة (A6/CR80) portrait، طباعة تلقائية بعد
 *    تحميل الصور.
 *  - طباعة جماعية: شبكة A4، تباعد أفقي/رأسي، خطوط دلالة (قص رأسي + حدود
 *    بطاقة بلون قابل للتخصيص)، امتداد لون البطاقة لخط القص (bleed)،
 *    ترتيب الوجهين (فوق بعض للطي / جنب بعض)، وجه الطباعة (وش/ظهر/الاثنين)،
 *    ضغط QR والصور للأعداد الكبيرة، وبناء عبر Blob URL لتجنّب حدود الحجم.
 */

import QRCode from "qrcode";
import { CardPrintOptions, CardTheme, BulkLayout, PrintMode } from "./types";
import { buildCardHTML, CardMember, CardService } from "./card-builder";
import { cardStyles, cardOnlyStyles } from "./card-styles";

/* ------------------------------------------------------------------ */
/*  QR + ضغط الصور                                                     */
/* ------------------------------------------------------------------ */

/** توليد QR data URL لكود المخدوم (compact = جودة أقل للأعداد الكبيرة). */
export async function generateQRDataUrl(
  code: string,
  compact = false
): Promise<string> {
  try {
    return await QRCode.toDataURL(code, {
      width: compact ? 180 : 240,
      margin: 1,
      errorCorrectionLevel: compact ? "M" : "H",
      color: { dark: "#0f172a", light: "#ffffff" },
    });
  } catch {
    return "";
  }
}

/** ضغط صورة (حد أقصى للأبعاد + JPEG) — للطباعة الجماعية. مع كاش داخلي. */
const photoCache = new Map<string, string>();
export function compressPhotoForBulk(
  photoUrl: string,
  maxDim = 200
): Promise<string> {
  return new Promise((resolve) => {
    if (!photoUrl) return resolve("");
    const key = `${photoUrl}|${maxDim}`;
    if (photoCache.has(key)) return resolve(photoCache.get(key)!);
    let done = false;
    const finish = (result: string) => {
      if (done) return;
      done = true;
      photoCache.set(key, result);
      resolve(result);
    };
    const timer = setTimeout(() => finish(photoUrl), 4000);
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        clearTimeout(timer);
        try {
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;
          if (!w || !h) return finish(photoUrl);
          const ratio = Math.min(1, maxDim / Math.max(w, h));
          const tw = Math.round(w * ratio);
          const th = Math.round(h * ratio);
          const canvas = document.createElement("canvas");
          canvas.width = tw;
          canvas.height = th;
          const ctx = canvas.getContext("2d")!;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, tw, th);
          ctx.drawImage(img, 0, 0, tw, th);
          finish(canvas.toDataURL("image/jpeg", 0.82));
        } catch {
          finish(photoUrl);
        }
      };
      img.onerror = () => {
        clearTimeout(timer);
        finish(photoUrl);
      };
      img.src = photoUrl;
    } catch {
      clearTimeout(timer);
      finish(photoUrl);
    }
  });
}

/* ------------------------------------------------------------------ */
/*  طباعة فردية                                                        */
/* ------------------------------------------------------------------ */

function pageSizeCss(cardSize: string, bulk = false): string {
  if (bulk) return "@page { size: A4 portrait; margin: 0; }";
  if (cardSize === "CR80") return "@page { size: 86mm 108mm; margin: 0; }";
  return "@page { size: 105mm 148mm; margin: 0; }";
}

const FONTS_LINK =
  '<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Noto+Sans+Arabic:wght@400;600;700;800;900&display=swap" rel="stylesheet">';

/** سكربت الطباعة التلقائية بعد اكتمال تحميل الصور. */
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

export type PrintResult = { ok: boolean; message: string };

/** طباعة بطاقة مخدوم واحدة في نافذة جديدة (بالوضع المحدد في opts.mode). */
export async function printSingleCard(
  member: CardMember,
  theme: CardTheme,
  service: CardService,
  opts: CardPrintOptions,
  overrides: Partial<CardPrintOptions> = {}
): Promise<PrintResult> {
  const qrDataUrl = await generateQRDataUrl(member.code);
  if (!qrDataUrl) return { ok: false, message: "تعذّر توليد QR" };

  const merged: CardPrintOptions = { ...opts, ...overrides };
  const cardHTML = buildCardHTML(member, theme, service, opts, {
    qrDataUrl,
    overrides,
  });

  const w = window.open("", "_blank");
  if (!w) return { ok: false, message: "فعّل النوافذ المنبثقة للطباعة" };

  const m = merged.mode;
  const modeLabel = m === "back" ? " (الظهر)" : m === "front" ? " (الوش)" : "";
  const title = `بطاقة${modeLabel} - ${member.name}`;
  const pageCss = pageSizeCss(merged.cardSize);
  const isSingleSide = m === "front" || m === "back";

  const singleCss =
    `@media print { ${pageCss} }` +
    "html,body{margin:0 !important;padding:0 !important;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;color-adjust:exact !important;}" +
    "*{ -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }" +
    "@media screen { body{min-height:100vh;display:flex;align-items:flex-start;justify-content:center;background:#e5e7eb;padding:20px 10px;} }" +
    ".a6-sheet,.cr80-sheet{margin:0 auto;display:block;}" +
    (isSingleSide
      ? "@media print { html,body{background:#fff !important;display:block !important;align-items:initial !important;justify-content:initial !important;min-height:0 !important;}" +
        ".a6-sheet,.cr80-sheet{box-shadow:none !important;margin:0 auto !important;}" +
        "}"
      : "@media print { html,body{background:#fff !important;display:block !important;align-items:initial !important;justify-content:initial !important;min-height:0 !important;}" +
        ".a6-sheet,.cr80-sheet{box-shadow:none !important;margin:0 !important;}" +
        "}");

  const html =
    '<!DOCTYPE html><html dir="rtl" lang="ar"><head>' +
    '<meta charset="UTF-8">' +
    `<title>${title}</title>` +
    FONTS_LINK +
    `<style>${cardStyles()}${singleCss}</style>` +
    "</head><body>" +
    '<div class="print-actions">' +
    '<button onclick="window.print()">🖨️ طباعة</button>' +
    '<button class="alt" onclick="window.close()">✕ إغلاق</button>' +
    "</div>" +
    cardHTML +
    AUTO_PRINT_SCRIPT +
    "</body></html>";

  w.document.write(html);
  w.document.close();
  return { ok: true, message: "تم تجهيز البطاقة للطباعة" };
}

/* ------------------------------------------------------------------ */
/*  طباعة جماعية (A4)                                                  */
/* ------------------------------------------------------------------ */

export type BulkDims = {
  w: number;
  h: number;
  perRow: number;
  perCol: number;
  total: number;
  gapX: number;
  gapY: number;
  layout: BulkLayout;
};

/** حساب أبعاد الشبكة على A4 حسب حجم البطاقة والوضع والتباعد. */
export function bulkCardDims(
  cardSize: string,
  mode: PrintMode,
  gapX: number,
  gapY: number,
  layout: BulkLayout
): BulkDims {
  gapX = Math.max(0, Math.min(20, Number(gapX) || 0));
  gapY = Math.max(0, Math.min(20, Number(gapY) || 0));
  let w: number, h: number;
  if (cardSize === "CR80") {
    w = 86;
    h = mode === "front" || mode === "back" || layout === "sideBySide" ? 54 : 108;
  } else {
    w = 105;
    h = mode === "front" || mode === "back" || layout === "sideBySide" ? 74 : 148;
  }
  const PAGE_W = 210,
    PAGE_H = 297;
  const perRow = Math.max(1, Math.floor((PAGE_W + gapX) / (w + gapX)));
  const perCol = Math.max(1, Math.floor((PAGE_H + gapY) / (h + gapY)));
  return { w, h, perRow, perCol, total: perRow * perCol, gapX, gapY, layout };
}

/** عنصر طباعة جماعية: مخدوم + ثيمه + overrides الخاصة به (من بروفايل فصله). */
export type BulkItem = {
  member: CardMember;
  theme: CardTheme;
  overrides: Partial<CardPrintOptions>;
};

export type BulkProgress = (done: number, total: number) => void;

/** بناء HTML كل البطاقات مع الضغط والـ bleed. */
async function buildBulkCardsHTML(
  items: BulkItem[],
  service: CardService,
  opts: CardPrintOptions,
  layout: BulkLayout,
  printSide: PrintMode,
  bleed: { enabled: boolean; cutOffsetMm: number },
  onProgress?: BulkProgress
): Promise<string[]> {
  const out: string[] = [];
  const sideBySide = printSide === "both" && layout === "sideBySide";
  const total = items.length;
  const compact = total > 50;

  const wrapBleed = (cardHtml: string, theme: CardTheme): string => {
    if (!bleed.enabled || bleed.cutOffsetMm <= 0) return cardHtml;
    const isWhite =
      String(theme.c1).toLowerCase() === "#ffffff" &&
      String(theme.c2).toLowerCase() === "#ffffff";
    const bleedBg = isWhite
      ? "#ffffff"
      : `linear-gradient(135deg,${theme.c1} 0%,${theme.c2} 100%)`;
    return `<div class="card-bleed-wrap" style="background:${bleedBg};padding:${bleed.cutOffsetMm}mm;">${cardHtml}</div>`;
  };

  for (let i = 0; i < total; i++) {
    const { member, theme, overrides } = items[i];
    const qrUrl = await generateQRDataUrl(member.code, compact);
    let m = member;
    if (compact && member.photo_url) {
      try {
        const compressed = await compressPhotoForBulk(member.photo_url, 200);
        if (compressed !== member.photo_url) m = { ...member, photo_url: compressed };
      } catch {
        /* keep original */
      }
    }
    const ov: Partial<CardPrintOptions> = { ...overrides, mode: printSide };
    if (sideBySide) {
      out.push(
        wrapBleed(
          buildCardHTML(m, theme, service, opts, {
            qrDataUrl: qrUrl,
            singleSideOnly: "front",
            overrides: ov,
          }),
          theme
        )
      );
      out.push(
        wrapBleed(
          buildCardHTML(m, theme, service, opts, {
            qrDataUrl: qrUrl,
            singleSideOnly: "back",
            overrides: ov,
          }),
          theme
        )
      );
    } else {
      out.push(
        wrapBleed(
          buildCardHTML(m, theme, service, opts, { qrDataUrl: qrUrl, overrides: ov }),
          theme
        )
      );
    }
    onProgress?.(i + 1, total);
    if (compact && (i + 1) % 10 === 0)
      await new Promise((r) => setTimeout(r, 0));
  }
  return out;
}

/**
 * طباعة جماعية على A4 في نافذة جديدة.
 * printSide: 'front' | 'back' | 'both'
 */
export async function printBulkCards(
  items: BulkItem[],
  service: CardService,
  opts: CardPrintOptions,
  printSide: PrintMode,
  defaultTheme: CardTheme,
  onProgress?: BulkProgress
): Promise<PrintResult> {
  if (!items.length) return { ok: false, message: "لا توجد بطاقات للطباعة" };

  const w = window.open("", "_blank");
  if (!w) return { ok: false, message: "فعّل النوافذ المنبثقة للطباعة" };

  // رسالة تحميل فورية
  try {
    w.document.write(
      '<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>جارٍ التحضير…</title>' +
        '<style>body{margin:0;font-family:"Tajawal",sans-serif;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;}' +
        ".box{text-align:center;padding:32px;}" +
        ".spin{width:48px;height:48px;border:4px solid rgba(255,255,255,0.2);border-top-color:#6366f1;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 18px;}" +
        "@keyframes spin{to{transform:rotate(360deg);}}" +
        "h2{font-size:18px;margin:0 0 8px;font-weight:700;}p{font-size:13px;opacity:0.7;margin:0;}" +
        `</style></head><body><div class="box"><div class="spin"></div><h2>جارٍ تجهيز ${items.length} بطاقة…</h2><p>الرجاء عدم إغلاق النافذة</p></div></body></html>`
    );
    w.document.close();
  } catch {
    /* ignore */
  }

  try {
    const layout: BulkLayout =
      printSide === "both" ? opts.bulkLayout || "folded" : "folded";
    const gapX = Math.max(0, Math.min(20, Number(opts.bulkGapX) || 0));
    const gapY = Math.max(0, Math.min(20, Number(opts.bulkGapY) || 0));
    const showFoldLine = !!opts.bulkShowFoldLine;
    const showCutLines = !!opts.bulkShowCutLines;
    const cutOffset = Math.max(0, Math.min(10, Number(opts.bulkCutLineOffset) || 0));
    const lineColor = /^#[0-9a-fA-F]{6}$/.test(opts.bulkLineColor || "")
      ? opts.bulkLineColor
      : "#6366f1";
    const bleed = { enabled: showCutLines && cutOffset > 0, cutOffsetMm: cutOffset };

    const cards = await buildBulkCardsHTML(
      items,
      service,
      opts,
      layout,
      printSide,
      bleed,
      onProgress
    );
    const dims = bulkCardDims(opts.cardSize, printSide, gapX, gapY, layout);
    const perPage = dims.total;
    const pages: string[][] = [];
    for (let i = 0; i < cards.length; i += perPage) pages.push(cards.slice(i, i + perPage));

    // خلفية الورقة: لو البروفايلات متنوعة → أبيض، وإلا تدرج الثيم
    const themeIds = new Set(items.map((it) => it.theme.id));
    const isMixed = themeIds.size > 1;
    const isWhite =
      String(defaultTheme.c1).toLowerCase() === "#ffffff" &&
      String(defaultTheme.c2).toLowerCase() === "#ffffff";
    const pageBg =
      isMixed || isWhite
        ? "#ffffff"
        : `linear-gradient(135deg,${defaultTheme.c1} 0%,${defaultTheme.c2} 100%)`;

    const cellW = bleed.enabled ? dims.w + 2 * bleed.cutOffsetMm : dims.w;
    const cellH = bleed.enabled ? dims.h + 2 * bleed.cutOffsetMm : dims.h;
    const PAGE_USABLE_H = 295;
    const gridW = dims.perRow * cellW + (dims.perRow - 1) * gapX;
    const gridH = dims.perCol * cellH + (dims.perCol - 1) * gapY;
    const padX = Math.max(0, (210 - gridW) / 2);
    const padY = Math.max(0, (PAGE_USABLE_H - gridH) / 2);

    const cutLineCss = showCutLines
      ? cutOffset > 0
        ? `.a4-grid .card-bleed-wrap{outline:0.3mm dashed ${lineColor} !important;outline-offset:0 !important;}`
        : `.a4-grid .a6-sheet,.a4-grid .cr80-sheet{outline:0.3mm dashed ${lineColor} !important;outline-offset:0 !important;}`
      : "";

    const extraCss =
      "@page { size: 210mm 297mm; margin: 0; }" +
      "*{box-sizing:border-box;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;color-adjust:exact !important;}" +
      "html{margin:0 !important;padding:0 !important;width:210mm;}" +
      `body{margin:0 !important;padding:0 !important;display:block !important;align-items:initial !important;justify-content:initial !important;min-height:0 !important;width:210mm;background:#94a3b8;font-family:"Cairo","Tajawal",sans-serif;}` +
      `.page{display:block;position:relative;width:210mm;height:295mm;background:${pageBg};overflow:hidden;box-sizing:border-box;page-break-after:always;break-after:page;padding:${padY}mm ${padX}mm;}` +
      ".page:last-of-type{page-break-after:auto !important;break-after:auto !important;}" +
      `.a4-grid{display:grid;grid-template-columns:repeat(${dims.perRow}, ${cellW}mm);grid-template-rows:repeat(${dims.perCol}, ${cellH}mm);column-gap:${gapX}mm;row-gap:${gapY}mm;margin:0;}` +
      ".a4-grid .a6-sheet,.a4-grid .cr80-sheet{box-shadow:none !important;border:none !important;}" +
      `.a4-grid .card-bleed-wrap{display:flex;align-items:center;justify-content:center;box-sizing:content-box;width:${dims.w}mm;height:${dims.h}mm;}` +
      cutLineCss +
      (showFoldLine && dims.perRow >= 2
        ? ".page{position:relative;}" +
          `.page::after{content:"";position:absolute;top:0;bottom:0;left:50%;width:0;border-left:0.3mm dashed ${lineColor};pointer-events:none;z-index:9999;}`
        : "") +
      ".a4-grid .fold-line{display:none !important;}" +
      "@media screen {" +
      ".page{margin:16px auto;box-shadow:0 6px 24px rgba(0,0,0,0.25);}" +
      (showCutLines
        ? ""
        : ".a4-grid .a6-sheet,.a4-grid .cr80-sheet{outline:0.2mm dashed rgba(255,255,255,0.4);}") +
      "}" +
      "@media print {" +
      `html,body{background:${pageBg} !important;width:210mm !important;margin:0 !important;padding:0 !important;}` +
      ".page{margin:0 !important;box-shadow:none !important;height:295mm !important;page-break-after:always !important;break-after:page !important;}" +
      ".page:last-of-type{page-break-after:auto !important;break-after:auto !important;}" +
      (showCutLines
        ? cutOffset > 0
          ? `.a4-grid .card-bleed-wrap{outline:0.3mm dashed ${lineColor} !important;outline-offset:0 !important;}` +
            ".a4-grid .a6-sheet,.a4-grid .cr80-sheet{outline:none !important;}"
          : `.a4-grid .a6-sheet,.a4-grid .cr80-sheet{outline:0.3mm dashed ${lineColor} !important;outline-offset:0 !important;}`
        : ".a4-grid .a6-sheet,.a4-grid .cr80-sheet{outline:none !important;} .a4-grid .card-bleed-wrap{outline:none !important;}") +
      ".print-actions{display:none !important;}" +
      "}";

    const headHTML =
      '<!DOCTYPE html><html dir="rtl" lang="ar"><head>' +
      '<meta charset="UTF-8">' +
      `<title>طباعة بطاقات (${items.length} / ${pages.length} صفحة)</title>` +
      FONTS_LINK +
      `<style>${cardOnlyStyles()}${extraCss}</style>` +
      "</head><body>" +
      '<div class="print-actions">' +
      `<button onclick="window.print()">🖨️ طباعة (${pages.length} صفحة)</button>` +
      '<button class="alt" onclick="window.close()">✕ إغلاق</button>' +
      "</div>";
    const tailHTML = "</body></html>";

    // Blob URL — يتجنّب حدود document.write للأعداد الكبيرة
    const chunks: string[] = [headHTML];
    for (const pageCards of pages) {
      chunks.push('<section class="page"><div class="a4-grid">');
      chunks.push(...pageCards);
      chunks.push("</div></section>");
    }
    chunks.push(tailHTML);
    try {
      const blob = new Blob(chunks, { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      w.location.replace(url);
      setTimeout(() => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          /* ignore */
        }
      }, 60000);
    } catch {
      // fallback: document.write
      w.document.open();
      for (const c of chunks) w.document.write(c);
      w.document.close();
    }
    return {
      ok: true,
      message: `تم تجهيز ${items.length} بطاقة / ${pages.length} صفحة`,
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
