/**
 * أنماط CSS للبطاقات (شاشة + طباعة) — نفس مرجع النظام الأصلي.
 * حجمان: A6 (105×74مم للوجه) و CR80 (86×54مم للوجه).
 */

export function cardStyles(): string {
  return (
    "*{box-sizing:border-box;margin:0;padding:0;}" +
    'body{font-family:"Cairo","Tajawal","Segoe UI",Arial,sans-serif;background:#e5e7eb;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:10px;}' +
    /* A6 */
    ".a6-sheet{width:105mm;height:148mm;background:transparent;position:relative;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.18);}" +
    ".a6-sheet.a6-single{height:74mm;}" +
    ".card-side.side-a6{width:105mm;height:74mm;flex:0 0 74mm;}" +
    /* CR80 */
    ".cr80-sheet{width:86mm;height:108mm;background:transparent;position:relative;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.18);}" +
    ".cr80-sheet.cr80-single{height:54mm;}" +
    ".card-side.side-cr80{width:86mm;height:54mm;flex:0 0 54mm;}" +
    /* مشترك */
    ".card-side{position:relative;overflow:hidden;display:flex;flex-direction:column;background-clip:padding-box !important;margin:0 !important;}" +
    ".card-side.card-front-v2,.card-side.card-back-v2{padding:0;}" +
    ".card-safe{position:absolute;inset:var(--safe-margin,4mm);display:flex;flex-direction:column;z-index:2;}" +
    "@media screen { .card-side.is-white{outline:0.4mm solid #e5e7eb;outline-offset:-0.4mm;} }" +
    /* الوش */
    ".card-header-v2{height:calc(11mm * var(--scale,1));display:flex;align-items:center;justify-content:center;gap:calc(2mm * var(--scale,1));padding:0 calc(3mm * var(--scale,1));background:var(--header-bg, rgba(0,0,0,0.18));color:var(--header-txt, inherit);border-radius:2mm;flex-shrink:0;}" +
    ".card-logo-mini{width:calc(7mm * var(--scale,1));height:calc(7mm * var(--scale,1));display:flex;align-items:center;justify-content:center;overflow:hidden;font-size:calc(3.5mm * var(--scale,1));flex-shrink:0;}" +
    ".card-logo-mini img{width:100%;height:100%;object-fit:contain;}" +
    ".card-service-name{font-size:calc(4.4mm * var(--scale,1));font-weight:800;letter-spacing:0.2px;}" +
    ".is-colored .card-service-name{text-shadow:0 1px 2px rgba(0,0,0,0.25);}" +
    ".card-body-v2{flex:1;display:flex;flex-direction:row;align-items:center;justify-content:space-between;padding:calc(3mm * var(--scale,1)) calc(1mm * var(--scale,1));gap:calc(3mm * var(--scale,1));min-height:0;}" +
    ".card-photo-col{width:calc(34mm * var(--scale,1));display:flex;align-items:center;justify-content:center;flex-shrink:0;}" +
    ".card-info-col{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:calc(2mm * var(--scale,1));min-width:0;}" +
    ".card-child-name-v2{font-size:calc(4.6mm * var(--scale,1));font-weight:800;text-align:center;line-height:1.15;max-width:100%;word-wrap:break-word;}" +
    ".is-colored .card-child-name-v2{text-shadow:0 1px 3px rgba(0,0,0,0.28);}" +
    ".card-qr-wrap-v2{width:calc(30mm * var(--scale,1));height:calc(30mm * var(--scale,1));background:#fff;border-radius:2mm;padding:1mm;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(0,0,0,0.18);}" +
    ".is-white .card-qr-wrap-v2{box-shadow:none;border:0.4mm solid #e5e7eb;}" +
    ".card-qr-img{width:100%;height:100%;display:block;}" +
    '.card-child-id-v2{font-family:"Courier New",monospace;font-size:calc(2.4mm * var(--scale,1));opacity:0.85;letter-spacing:0.6px;padding:0.6mm 2mm;border-radius:2mm;background:var(--header-bg, rgba(0,0,0,0.18));}' +
    ".is-white .card-child-id-v2{opacity:1;}" +
    ".card-photo-v2{width:calc(32mm * var(--scale,1));height:calc(32mm * var(--scale,1));border-radius:50%;overflow:hidden;border:0.8mm solid rgba(255,255,255,0.85);box-shadow:0 4px 12px rgba(0,0,0,0.25);background:#fff;}" +
    ".is-white .card-photo-v2{border:0.6mm solid #e5e7eb;box-shadow:0 2px 6px rgba(0,0,0,0.10);}" +
    ".card-photo-v2 img{width:100%;height:100%;object-fit:cover;display:block;}" +
    ".card-photo-v2 .card-photo-ph{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:calc(12mm * var(--scale,1));font-weight:900;letter-spacing:0.4mm;line-height:1;text-shadow:none;}" +
    ".is-colored .card-photo-v2 .card-photo-ph{background:#ffffff;color:#0f172a;}" +
    ".is-white .card-photo-v2 .card-photo-ph{background:#f1f5f9;color:#475569;}" +
    /* اللوجو بدل الصورة — بدون دائرة (حجم أكبر) */
    ".card-photo-v2.has-logo{background:transparent !important;border:none !important;box-shadow:none !important;border-radius:0 !important;overflow:visible !important;width:calc(38mm * var(--scale,1));height:calc(38mm * var(--scale,1));}" +
    ".card-photo-v2.has-logo .card-photo-logo{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:transparent !important;padding:0;}" +
    ".card-photo-v2.has-logo .card-photo-logo img{width:100%;height:100%;object-fit:contain;display:block;}" +
    ".card-photo-v2.has-logo .card-photo-logo .logo-ph{font-size:calc(24mm * var(--scale,1));}" +
    ".card-photo-v2 .card-photo-logo{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#ffffff;padding:calc(3mm * var(--scale,1));}" +
    ".is-white .card-photo-v2 .card-photo-logo{background:#f8fafc;}" +
    ".card-photo-v2 .card-photo-logo img{width:100%;height:100%;object-fit:contain;}" +
    /* الفوتر */
    ".card-footer-v2{height:calc(9mm * var(--scale,1));display:flex;align-items:center;justify-content:center;gap:calc(2mm * var(--scale,1));background:var(--footer-bg, rgba(0,0,0,0.22));color:var(--footer-txt, inherit);border-radius:2mm;font-size:calc(3.0mm * var(--scale,1));font-weight:700;letter-spacing:0.3px;flex-shrink:0;}" +
    ".is-colored .card-footer-v2{text-shadow:0 1px 2px rgba(0,0,0,0.25);}" +
    /* الظهر */
    ".card-back-v2{transform:rotate(180deg);}" +
    ".card-back-v2.no-rotate{transform:none;}" +
    ".card-back-v2 .card-safe{align-items:center;justify-content:center;}" +
    ".card-back-inner-v2{display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;gap:calc(3mm * var(--scale,1));}" +
    ".card-back-logo{width:calc(46mm * var(--scale,1));height:calc(46mm * var(--scale,1));display:flex;align-items:center;justify-content:center;overflow:hidden;}" +
    ".card-back-logo img{width:100%;height:100%;object-fit:contain;}" +
    ".card-back-logo .logo-ph{font-size:calc(28mm * var(--scale,1));}" +
    ".card-back-svc-v2{font-size:calc(4.8mm * var(--scale,1));font-weight:800;letter-spacing:0.4px;text-align:center;padding:0 calc(4mm * var(--scale,1));}" +
    ".is-colored .card-back-svc-v2{text-shadow:0 1px 3px rgba(0,0,0,0.30);}" +
    /* خط الطي */
    ".fold-line{height:0;border-top:1.2px dashed #94a3b8;position:relative;display:flex;align-items:center;justify-content:center;}" +
    ".fold-line span{position:absolute;top:-7px;background:#fff;padding:0 8px;font-size:9px;color:#64748b;font-family:Arial,sans-serif;}" +
    /* الطباعة */
    "@media print {" +
    "html,body{background:#fff !important;padding:0 !important;margin:0 !important;}" +
    ".a6-sheet,.cr80-sheet{box-shadow:none !important;}" +
    ".fold-line{border-top-color:#cbd5e1;}" +
    ".fold-line span{color:#94a3b8;font-size:7px;}" +
    "}" +
    /* أزرار الطباعة في نافذة المعاينة */
    ".print-actions{position:fixed;top:12px;left:12px;display:flex;gap:8px;z-index:9999;}" +
    ".print-actions button{padding:8px 14px;border:none;border-radius:8px;background:#0f172a;color:#fff;font-family:inherit;cursor:pointer;font-size:13px;font-weight:700;box-shadow:0 4px 12px rgba(0,0,0,0.2);}" +
    ".print-actions button.alt{background:#dc2626;}" +
    "@media print { .print-actions{display:none !important;} }"
  );
}

/** أنماط البطاقات فقط (بدون body flex) — للطباعة الجماعية. */
export function cardOnlyStyles(): string {
  return cardStyles()
    .replace(/body\s*\{[^}]*\}/g, "")
    .replace(/html\s*,\s*body\s*\{[^}]*\}/g, "")
    .replace(/\*\s*\{[^}]*\}/g, "*{box-sizing:border-box;}");
}
