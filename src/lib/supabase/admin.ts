import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Admin (service-role) Supabase client — SERVER ONLY.
 *
 * Bypasses Row Level Security so a broadcast can read every user's push
 * subscription in order to deliver a device notification to all users.
 *
 * Requires the SUPABASE_SERVICE_ROLE_KEY environment variable (server-side
 * only — NEVER expose it to the browser).
 *
 * Returns null when the key is not configured (so callers can degrade
 * gracefully to in-app-only notifications).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) return null;

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
