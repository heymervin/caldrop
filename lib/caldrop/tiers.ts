// lib/caldrop/tiers.ts
import type { SupabaseClient } from '@supabase/supabase-js'

export const FREE_EVENT_LIMIT = 3

export async function canCreateEvent(
  supabase: SupabaseClient,
  userId: string,
  plan: string
): Promise<{ allowed: boolean; reason?: string }> {
  if (plan === 'paid') return { allowed: true }

  const { count } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if ((count ?? 0) >= FREE_EVENT_LIMIT) {
    return {
      allowed: false,
      reason: `Free plan is limited to ${FREE_EVENT_LIMIT} events.`,
    }
  }

  return { allowed: true }
}
