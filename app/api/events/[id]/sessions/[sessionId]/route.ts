// app/api/events/[id]/sessions/[sessionId]/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string; sessionId: string }> }

const ALLOWED_SESSION_FIELDS = ['title', 'start_at', 'end_at', 'meeting_url', 'sort_order'] as const
type AllowedSessionField = (typeof ALLOWED_SESSION_FIELDS)[number]

export async function PATCH(req: Request, { params }: Params) {
  const { id: eventId, sessionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify event ownership
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('user_id', user.id)
    .single()
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const rawPatch = await req.json()
  const patch: Partial<Record<AllowedSessionField, unknown>> = {}
  for (const field of ALLOWED_SESSION_FIELDS) {
    if (field in rawPatch) patch[field] = rawPatch[field]
  }

  const { data: session, error } = await supabase
    .from('sessions')
    .update(patch)
    .eq('id', sessionId)
    .eq('event_id', eventId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(session)
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id: eventId, sessionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('user_id', user.id)
    .single()
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await supabase.from('sessions').delete().eq('id', sessionId).eq('event_id', eventId)
  return new NextResponse(null, { status: 204 })
}
