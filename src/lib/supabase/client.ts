import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client.
 *
 * Reads credentials from environment variables that you set in Vercel:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * These are safe to expose to the browser (the anon key is public by design,
 * protected by Supabase Row Level Security). Never put service-role keys here.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase env vars are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel (or .env.local for local dev)."
    );
  }

  return createBrowserClient(url, anonKey);
}

/** True when both Supabase env vars are present (used to gate auth UI safely). */
export const isSupabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
