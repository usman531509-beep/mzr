import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only Supabase client used for storage uploads. We need the service
// role key so the upload bypasses RLS for the bucket. Client never sees this
// — it lives only on the server.

const url     = process.env.SUPABASE_URL;
const key     = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket  = process.env.SUPABASE_BUCKET ?? "products";

export const SUPABASE_BUCKET = bucket;
export const supabaseConfigured = !!(url && key);

let cached: SupabaseClient | null = null;
export function getSupabase(): SupabaseClient | null {
  if (!supabaseConfigured) return null;
  if (cached) return cached;
  cached = createClient(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
