// app/api/e/[slug]/ics/route.ts
import { NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { buildICS } from '@/lib/caldrop/ics'
import type { EventWithSessions } from '@/types/caldrop'

type Params = { params: Promise<{ slug: string }> }

export async function GET(_req: Request, { params }: Params) {
  const { slug } = await params

  const { data: event } = await adminSupabase
    .from('events')
    .select('*, sessions(*)')
    .eq('slug', slug)
    .eq('status', 'published')
    .order('sort_order', { referencedTable: 'sessions' })
    .single()

  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const ics = buildICS(event as EventWithSessions)

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${slug}.ics"`,
    },
  })
}
