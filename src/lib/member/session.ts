/**
 * Member portal session — a signed (HMAC-SHA256) httpOnly cookie holding the
 * member's card code. Uses Web Crypto so it runs in BOTH the Edge middleware
 * and the Node server runtime.
 *
 * The card code itself is the credential (possession of the card), the
 * signature prevents cookie tampering/forgery of arbitrary payloads.
 */

export const MEMBER_COOKIE = "member_session";

/** "Remember me" lifetime (180 days). Otherwise the cookie is session-only. */
export const MEMBER_REMEMBER_MAX_AGE = 60 * 60 * 24 * 180;

export type MemberSession = {
  code: string;
  name: string;
  exp: number; // unix seconds
};

function secret(): string {
  return (
    process.env.MEMBER_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "dev-member-secret"
  );
}

function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmac(data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return b64urlEncode(new Uint8Array(sig));
}

/** Create a signed session token for a member. */
export async function createMemberToken(
  code: string,
  name: string,
  remember: boolean
): Promise<string> {
  const exp =
    Math.floor(Date.now() / 1000) +
    (remember ? MEMBER_REMEMBER_MAX_AGE : 60 * 60 * 24 * 2); // 2 days for session cookies
  const payload: MemberSession = { code, name, exp };
  const body = b64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await hmac(body);
  return `${body}.${sig}`;
}

/** Verify a token; returns the session or null (bad signature / expired). */
export async function verifyMemberToken(
  token: string | undefined | null
): Promise<MemberSession | null> {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  try {
    const expected = await hmac(body);
    if (sig !== expected) return null;
    const payload = JSON.parse(
      new TextDecoder().decode(b64urlDecode(body))
    ) as MemberSession;
    if (!payload.code || typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
