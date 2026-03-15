import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy singleton — deferred until first use so build-time evaluation
// with placeholder env vars doesn't throw.
let _adminSupabase: SupabaseClient | null = null

export function getAdminSupabase(): SupabaseClient {
  if (!_adminSupabase) {
    _adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
  }
  return _adminSupabase
}

// Convenience re-export for callers that used the old singleton name.
// Using a Proxy keeps the original call-site syntax (adminSupabase.from(...))
// while still deferring construction until the first property access.
export const adminSupabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getAdminSupabase() as any)[prop]
  },
})
