import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

let adminClient: SupabaseClient | null = null;

/**
 * Server-only Supabase client using the service role key (bypasses RLS).
 * Returns null when SUPABASE_SERVICE_ROLE_KEY is not configured.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  if (!adminClient) {
    adminClient = createClient(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return adminClient;
}

/** Prefer service role; fall back to anon (requires supabase/policies.sql). */
export function getSupabaseForWrites(): SupabaseClient {
  return getSupabaseAdmin() ?? supabase;
}
