/**
 * بنّاء HTML البطاقة + أنماط CSS للطباعة — منقول من نظام الطباعة المرجعي.
 *
 * البطاقة:
 *  - وش: هيدر (لوجو + اسم الخدمة) · جسم (اسم المخدوم + QR + رقم | صورة/لوجو)
 *    · فوتر (اسم الفصل)
 *  - ظهر: لوجو الخدمة + اسم الخدمة (مقلوب 180° في وضع وش+ظهر للطي)
 *  - كل الأحجام تتحجّم تناسبياً مع "المساحة الآمنة للقص" عبر CSS variables.
 */

import { CardPrintOptions, CardTheme } from "./types";

/** بيانات مبسطة للمخدوم المطلوبة لبناء البطاقة. */
export type CardMember = {
  id: string;
  code: string;
  name: string;
  photo_url: string | null;
  className: string; // اسم الفصل الجاهز للعرض
};

/** بيانات الخدمة (من الإعدادات). */
export type CardService = {
  serviceName: string;
  logoUrl: string | null;
};

function esc(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function initials(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return parts
    .slice(0, 2)
    .map((p) => p.charAt(0))
    .join("");
}

export type BuildCardOpts = {
  qrDataUrl?: string;
  /** بناء وجه واحد فقط (للترتيب جنب بعض في الجماعية). */
  singleSideOnly?: "front" | "back";
  overrides?: Partial<CardPrintOptions>;
};

/**
 * بناء HTML بطاقة واحدة (وش / ظهر / وش+ظهر حسب mode).
 */
export function buildCardHTML(
  member: CardMember,
  theme: CardTheme,
  service: CardService,
  baseOpts: CardPrintOptions,
  opts: BuildCardOpts = {}
): string {
  const o: CardPrintOptions = { ...baseOpts, ...(opts.overrides || {}) };
  const serviceName = service.serviceName || "خدمة الكنيسة";
  const serviceLogo = service.logoUrl || "";
  const cls = member.className || "";
  const qrSrc = opts.qrDataUrl || "";
  const photo = member.photo_url || "";
  const ini = initials(member.name);
  const safeMM = Math.max(0, Math.min(10, Number(o.safeMargin) || 4));

  // أبعاد البطاقة
  const isCR80 = o.cardSize === "CR80";
  const cardW = isCR80 ? 86 : 105;
  const cardH = isCR80 ? 54 : 74;
  // معامل التحجيم المتناسب — المرجع A6 عند safe=4mm → inner 97×66 → scale=1
  const innerW = cardW - 2 * safeMM;
  const innerH = cardH - 2 * safeMM;
  const scale = Math.max(0.45, Math.min(1.12, Math.min(innerW / 97, innerH / 66)));

  const isWhite =
    String(theme.c1).toLowerCase() === "#ffffff" &&
    String(theme.c2).toLowerCase() === "#ffffff";
  const sideClass = isWhite ? "is-white" : "is-colored";
  const headerBg = o.headerColor || (isWhite ? "#f1f5f9" : "rgba(0,0,0,0.20)");
  const footerBg = o.footerColor || (isWhite ? "#f1f5f9" : "rgba(0,0,0,0.22)");
  const headerTxt = o.headerTextColor || theme.text;
  const footerTxt = o.footerTextColor || theme.text;

  const bgStyle = isWhite
    ? "background:#ffffff;"
    : `background:linear-gradient(135deg,${theme.c1} 0%,${theme.c2} 100%);`;
  const bgBackStyle = isWhite
    ? "background:#ffffff;"
    : `background:linear-gradient(135deg,${theme.c2} 0%,${theme.c1} 100%);`;
  const cssVars = `--safe-margin:${safeMM}mm;--scale:${scale.toFixed(4)};--header-bg:${headerBg};--footer-bg:${footerBg};--header-txt:${headerTxt};--footer-txt:${footerTxt};`;

  const logoImg = serviceLogo
    ? `<img src="${serviceLogo}" alt="">`
    : `<span class="logo-ph">⛪</span>`;

  // صورة المخدوم أو اللوجو أو حرفين الاسم
  let photoBlock: string;
  if (o.useLogoInsteadOfPhoto) {
    photoBlock = `<div class="card-photo-logo">${logoImg}</div>`;
  } else if (photo) {
    photoBlock = `<img src="${photo}" alt="">`;
  } else {
    photoBlock = `<div class="card-photo-ph">${esc(ini)}</div>`;
  }

  const sz = isCR80 ? "cr80" : "a6";
  const sheetClass = sz === "cr80" ? "cr80-sheet" : "a6-sheet";
  const singleClass = sz === "cr80" ? "cr80-single" : "a6-single";
  const sideSizeClass = sz === "cr80" ? "side-cr80" : "side-a6";
  const qrBlock = qrSrc
    ? `<img src="${qrSrc}" class="card-qr-img" alt="QR">`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#999;font-size:3mm;">QR</div>`;

  // ===== الوش =====
  const headerHTML = o.frontHeader
    ? `<div class="card-header-v2"><div class="card-logo-mini">${logoImg}</div><div class="card-service-name">${esc(serviceName)}</div></div>`
    : "";

  const photoExtraClass = o.useLogoInsteadOfPhoto ? " has-logo" : "";
  const photoCol = o.frontPhoto
    ? `<div class="card-photo-col"><div class="card-photo-v2${photoExtraClass}">${photoBlock}</div></div>`
    : `<div class="card-photo-col"></div>`;

  const infoCol =
    `<div class="card-info-col">` +
    (o.frontName ? `<div class="card-child-name-v2">${esc(member.name)}</div>` : "") +
    (o.frontQR ? `<div class="card-qr-wrap-v2">${qrBlock}</div>` : "") +
    (o.frontId ? `<div class="card-child-id-v2">${esc(member.code)}</div>` : "") +
    `</div>`;

  const footerHTML = o.frontFooter
    ? `<div class="card-footer-v2">🔖 ${esc(cls)}</div>`
    : "";

  const front =
    `<div class="card-side card-front-v2 ${sideClass} ${sideSizeClass}" style="${bgStyle}color:${theme.text};${cssVars}">` +
    `<div class="card-safe">${headerHTML}<div class="card-body-v2">${infoCol}${photoCol}</div>${footerHTML}</div>` +
    `</div>`;

  // ===== الظهر =====
  const backExtraClass = opts.singleSideOnly === "back" ? " no-rotate" : "";
  const back =
    `<div class="card-side card-back-v2${backExtraClass} ${sideClass} ${sideSizeClass}" style="${bgBackStyle}color:${theme.text};${cssVars}">` +
    `<div class="card-safe"><div class="card-back-inner-v2">` +
    (o.backLogo ? `<div class="card-back-logo">${logoImg}</div>` : "") +
    (o.backServiceName ? `<div class="card-back-svc-v2">${esc(serviceName)}</div>` : "") +
    `</div></div></div>`;

  if (opts.singleSideOnly === "front")
    return `<div class="${sheetClass} ${singleClass}">${front}</div>`;
  if (opts.singleSideOnly === "back")
    return `<div class="${sheetClass} ${singleClass}">${back}</div>`;

  if (o.mode === "front")
    return `<div class="${sheetClass} ${singleClass}">${front}</div>`;
  if (o.mode === "back") {
    const backNoRotate = back
      .replace("card-back-v2 ", "card-back-v2 no-rotate ")
      .replace('card-back-v2"', 'card-back-v2 no-rotate"');
    return `<div class="${sheetClass} ${singleClass}">${backNoRotate}</div>`;
  }
  // وش+ظهر — الوش فوق والظهر تحت مقلوب 180° (للطي بالنص)
  return (
    `<div class="${sheetClass}">` +
    front +
    `<div class="fold-line"><span>✂ اطوِ هنا</span></div>` +
    back +
    `</div>`
  );
}
