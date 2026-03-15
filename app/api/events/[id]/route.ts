// app/api/events/[id]/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

// Whitelist of fields the client is allowed to update on events
const ALLOWED_EVENT_FIELDS = ['title', 'description', 'timezone', 'status'] as const
type AllowedEventField = (typeof ALLOWED_EVENT_FIELDS)[number]

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: event } = await supabase
    .from('events')
    .select('*, sessions(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .order('sort_order', { referencedTable: 'sessions' })
    .single()

  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(event)
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rawPatch = await req.json()

  // Whitelist — only allow safe fields
  const patch: Partial<Record<AllowedEventField, unknown>> = {}
  for (const field of ALLOWED_EVENT_FIELDS) {
    if (field in rawPatch) patch[field] = rawPatch[field]
  }

  // Prevent publishing with zero sessions
  if (patch.status === 'published') {
    const { count } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', id)
    if ((count ?? 0) === 0) {
      return NextResponse.json(
        { error: 'Cannot publish an event with no sessions.' },
        { status: 422 }
      )
    }
  }

  const { data: event, error } = await supabase
    .from('events')
    .update(patch)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(event)
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify ownership first
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await supabase.from('events').delete().eq('id', id).eq('user_id', user.id)

  return new NextResponse(null, { status: 204 })
}
