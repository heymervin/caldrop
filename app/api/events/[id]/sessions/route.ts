// app/api/events/[id]/sessions/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Params) {
  const { id: eventId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify ownership
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('user_id', user.id)
    .single()
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()

  const { data: existing } = await supabase
    .from('sessions')
    .select('sort_order')
    .eq('event_id', eventId)
    .order('sort_order', { ascending: false })
    .limit(1)
  const nextOrder = ((existing?.[0]?.sort_order) ?? -1) + 1

  const { data: session, error } = await supabase
    .from('sessions')
    .insert({
      event_id: eventId,
      title: body.title || null,
      start_at: body.start_at,
      end_at: body.end_at,
      meeting_url: body.meeting_url || null,
      sort_order: body.sort_order ?? nextOrder,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(session, { status: 201 })
}
