import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — bypasses RLS via SUPABASE_SERVICE_ROLE_KEY.
 * Server-only. Never import this from a Client Component or leak its
 * results (tokens, links) to logs.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
