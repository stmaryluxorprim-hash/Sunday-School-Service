/**
 * "Remember me" for USERS (الخدّام) — Supabase Auth.
 *
 * Supabase stores its session in cookies with a long expiry by default.
 * When the user unchecks "تذكرني" we set REMEMBER_COOKIE = "0"; the
 * middleware then strips maxAge/expires from the Supabase auth cookies,
 * turning them into browser-session cookies (deleted on browser close).
 */
export const REMEMBER_COOKIE = "auth_remember";

export const REMEMBER_MAX_AGE = 60 * 60 * 24 * 400; // 400 days
