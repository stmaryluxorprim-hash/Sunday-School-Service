"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** يولّد صورة QR لكود العضوية (نفس الكود الذي يمسحه الخادم). */
export function MemberCardQR({ code }: { code: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(code, { width: 240, margin: 1 })
      .then((url) => alive && setDataUrl(url))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [code]);

  if (!dataUrl) {
    return (
      <div className="grid h-48 w-48 place-items-center rounded-2xl bg-surface-muted text-xs text-ink-muted">
        جارٍ التوليد...
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dataUrl}
      alt="QR كارت العضوية"
      className="h-48 w-48 rounded-2xl border border-white/60 bg-white p-2 shadow-card"
    />
  );
}
