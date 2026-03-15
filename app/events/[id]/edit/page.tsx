// app/events/[id]/edit/page.tsx
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { EventForm } from '@/components/EventForm'
import type { EventWithSessions } from '@/types/caldrop'

type Params = { params: Promise<{ id: string }> }

export default async function EditEventPage({ params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: event } = await supabase
    .from('events')
    .select('*, sessions(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .order('sort_order', { referencedTable: 'sessions' })
    .single()

  if (!event) notFound()

  return (
    <div>
      <div className="max-w-3xl mx-auto px-4 pt-6 flex justify-end">
        <Link
          href={`/events/${id}/analytics`}
          className="text-sm text-muted-foreground hover:underline"
        >
          View Analytics
        </Link>
      </div>
      <EventForm event={event as EventWithSessions} />
    </div>
  )
}
