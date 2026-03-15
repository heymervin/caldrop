// app/api/analytics/track/route.ts
import { NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Lazy singleton — only initialised when Upstash env vars are present.
let _ratelimit: Ratelimit | null = null
function getRatelimit(): Ratelimit | null {
  if (_ratelimit) return _ratelimit
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token || url === 'your_upstash_url') return null
  _ratelimit = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(5, '1 m'),
    prefix: 'caldrop:analytics',
  })
  return _ratelimit
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const body = await req.json()
  const { event_id, session_id, type, platform } = body

  // Validate required fields
  if (!event_id || !type) return new NextResponse(null, { status: 204 })

  // Validate enum values
  const VALID_TYPES = ['view', 'calendar_add'] as const
  const VALID_PLATFORMS = ['google', 'apple', 'outlook', 'yahoo', 'office365', 'ics']
  if (!VALID_TYPES.includes(type)) return new NextResponse(null, { status: 204 })
  if (platform && !VALID_PLATFORMS.includes(platform)) return new NextResponse(null, { status: 204 })

  // Rate limit per IP per event (skipped when Upstash is not configured)
  const ratelimit = getRatelimit()
  if (ratelimit) {
    const { success } = await ratelimit.limit(`${ip}:${event_id}`)
    if (!success) return new NextResponse(null, { status: 429 })
  }

  // Validate event exists and is published
  const { data: event } = await adminSupabase
    .from('events')
    .select('id')
    .eq('id', event_id)
    .eq('status', 'published')
    .maybeSingle()

  if (!event) return new NextResponse(null, { status: 204 })

  // If session_id is provided, validate it belongs to this event
  if (session_id) {
    const { data: session } = await adminSupabase
      .from('sessions')
      .select('id')
      .eq('id', session_id)
      .eq('event_id', event_id)
      .maybeSingle()
    if (!session) return new NextResponse(null, { status: 204 })
  }

  const { error: insertError } = await adminSupabase.from('analytics').insert({
    event_id,
    session_id: session_id ?? null,
    type,
    platform: platform ?? null,
  })

  // Silently ignore DB constraint violations (malformed type/platform values)
  // but log for observability
  if (insertError) {
    console.error('[analytics/track] insert error:', insertError.message)
  }

  return new NextResponse(null, { status: 204 })
}
