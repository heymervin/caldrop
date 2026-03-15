// app/api/events/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateSlug } from '@/lib/caldrop/slug'
import { canCreateEvent } from '@/lib/caldrop/tiers'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('plan')
    .eq('id', user.id)
    .single()

  const check = await canCreateEvent(supabase, user.id, profile?.plan ?? 'free')
  if (!check.allowed) {
    return NextResponse.json({ error: check.reason }, { status: 403 })
  }

  const body = await req.json()
  const { title, description, timezone, sessions: sessionInputs } = body

  // Generate unique slug with safe retry
  let slug = generateSlug()
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: existing } = await supabase
      .from('events')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
    if (!existing) break
    slug = generateSlug()
    if (attempt === 4) {
      return NextResponse.json({ error: 'Could not generate unique slug' }, { status: 500 })
    }
  }

  const { data: event, error } = await supabase
    .from('events')
    .insert({
      title,
      description: description || null,
      timezone: timezone || 'UTC',
      slug,
      user_id: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (sessionInputs?.length) {
    const rows = sessionInputs.map((s: any, i: number) => ({
      event_id: event.id,
      title: s.title || null,
      start_at: s.start_at,
      end_at: s.end_at,
      meeting_url: s.meeting_url || null,
      sort_order: i,
    }))
    await supabase.from('sessions').insert(rows)
  }

  return NextResponse.json(event, { status: 201 })
}
