import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// ── Connection pooling notes ─────────────────────────────────────
// Supabase Postgres: for serverless/edge workloads use the transaction
// pooler endpoint (port 6543, e.g. db.<ref>.pooler.supabase.com) via
// SUPABASE_DB_URL / PGBOUNCER settings rather than the direct
// connection (port 5432). Keep client lifetimes short: one client per
// request, no module-level long-lived pools, and avoid transactions
// spanning awaits (pooler session pinning). If we add raw `pg` queries
// later, create a pool with `connectionLimit` ~1-5 per instance and
// always `.release()`/`.end()` within the request.

export async function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[],
        ) {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        },
      },
    },
  );
}
