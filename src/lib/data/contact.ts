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
 * Stored "+201273447740" → "201273447740" (drop + and the local leading 0).
 */
export function whatsappLink(stored: string | null, text?: string): string {
  let n = intlNumber(stored).replace(/^\+/, "");
  // stored is "2" + "0XXXXXXXXXX" → we want "2" + "XXXXXXXXXX" (drop the 0)
  if (n.startsWith("20")) n = "2" + n.slice(3); // 2 + 0 + 10 → 2 + 10
  if (!n) return "";
  return text
    ? `https://wa.me/${n}?text=${encodeURIComponent(text)}`
    : `https://wa.me/${n}`;
}

/** Whether we have a usable phone number at all. */
export function hasPhone(stored: string | null): boolean {
  return intlNumber(stored).length >= 8;
}
