import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

// ponytail: single shared browser client, created lazily so prerender/build
// never touches env. Service-role key never leaves the server.
export function supabase(): SupabaseClient {
  client ??= (() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
    if (!url || !anon) throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL/ANON_KEY.");
    return createClient(url, anon);
  })();
  return client;
}
