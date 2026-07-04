/**
 * Contact helpers — build tel: / sms: / WhatsApp links from a stored phone.
 *
 * Stored phone format is "+2" + 11 local digits (e.g. +201273447740).
 * - tel:      uses the full international number.
 * - sms:      uses the full international number.
 * - whatsapp: uses the number WITHOUT the "+" and WITHOUT the leading local 0,
 *             i.e. "20" + 10 digits (WhatsApp expects country code + number).
 */

/** Extract the international E.164-ish number from stored "+2…". */
export function intlNumber(stored: string | null): string {
  return (stored || "").replace(/[^\d+]/g, "");
}

/** Build a tel: link (returns "" when no phone). */
export function telLink(stored: string | null): string {
  const n = intlNumber(stored);
  return n ? `tel:${n}` : "";
}

/** Build an sms: link with optional prefilled body. */
export function smsLink(stored: string | null, body?: string): string {
  const n = intlNumber(stored);
  if (!n) return "";
  return body ? `sms:${n}?body=${encodeURIComponent(body)}` : `sms:${n}`;
}

/**
 * Build a WhatsApp wa.me link.
 *
 * Stored format is "+2" + 11 local digits (e.g. "+2" + "01273447740"), which
 * already equals the international number Egypt "20" + 10 digits without the
 * local leading 0 → "201273447740". So the wa.me number is simply the stored
 * digits without the "+" (no extra digit must be dropped — dropping one was
 * the bug that produced unreadable WhatsApp numbers).
 */
export function whatsappLink(stored: string | null, text?: string): string {
  const n = intlNumber(stored).replace(/^\+/, "").replace(/\D/g, "");
  if (!n) return "";
  return text
    ? `https://wa.me/${n}?text=${encodeURIComponent(text)}`
    : `https://wa.me/${n}`;
}

/** Whether we have a usable phone number at all. */
export function hasPhone(stored: string | null): boolean {
  return intlNumber(stored).length >= 8;
}
