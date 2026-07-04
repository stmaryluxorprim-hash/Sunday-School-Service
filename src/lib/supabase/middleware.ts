import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { MEMBER_COOKIE, verifyMemberToken } from "@/lib/member/session";
import { REMEMBER_COOKIE } from "@/lib/auth/remember";

/**
 * Refreshes the Supabase session on every request and enforces auth routing
 * for BOTH kinds of visitors:
 *
 *  - الخدّام (users)  : Supabase Auth — protected app pages ("/", /data, …).
 *  - المخدومون (members): signed card-code cookie — portal pages (/member/*).
 *
 * Routing rules:
 *  - Unauthenticated visitor on a protected page → /welcome (اختيار نوع الدخول).
 *  - Signed-in user on /welcome or /login → /  (home).
 *  - Signed-in member on /welcome or /member/login → /member (portal home).
 *  - Member pages (/member/*) require a valid member session.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const pathname = request.nextUrl.pathname;
  const isWelcome = pathname === "/welcome";
  const isUserLogin = pathname.startsWith("/login");
  const isMemberLogin = pathname === "/member/login";
  const isMemberArea = pathname.startsWith("/member") && !isMemberLogin;

  // --- Member session (signed cookie, verified with Web Crypto — Edge-safe) --
  const memberSession = await verifyMemberToken(
    request.cookies.get(MEMBER_COOKIE)?.value
  );

  // Member area: needs a valid member session.
  if (isMemberArea) {
    if (!memberSession) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/member/login";
      return NextResponse.redirect(redirectUrl);
    }
    return supabaseResponse; // member OK — no Supabase auth needed here
  }

  // A signed-in member landing on the gate/login pages → portal home.
  if (memberSession && (isWelcome || isMemberLogin)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/member";
    return NextResponse.redirect(redirectUrl);
  }

  // Member login page is public.
  if (isMemberLogin) return supabaseResponse;

  // --- Supabase session (users / الخدّام) --------------------------------
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If env vars are missing, don't break the app — just pass through.
  if (!url || !anonKey) {
    return supabaseResponse;
  }

  // "Remember me" (users): when the user chose NOT to be remembered, the
  // Supabase auth cookies are written WITHOUT an expiry → session cookies
  // that vanish when the browser closes.
  const rememberOff = request.cookies.get(REMEMBER_COOKIE)?.value === "0";

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          const opts = { ...(options || {}) } as Record<string, unknown>;
          if (rememberOff) {
            delete opts.maxAge;
            delete opts.expires;
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          supabaseResponse.cookies.set(name, value, opts as any);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not signed in → the entry gate asks "member or user?" first.
  if (!user && !isUserLogin && !isWelcome) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/welcome";
    return NextResponse.redirect(redirectUrl);
  }

  // Signed in and on the gate/login page → go home
  if (user && (isUserLogin || isWelcome)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
