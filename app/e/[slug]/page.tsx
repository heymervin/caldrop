import { cache } from 'react'
import { notFound } from 'next/navigation'
import { adminSupabase } from '@/lib/supabase/admin'
import { TrackView } from '@/components/TrackView'
import { PublicEventView } from '@/components/PublicEventView'
import type { EventWithSessions } from '@/types/caldrop'

type Params = { params: Promise<{ slug: string }> }

const getEvent = cache(async (slug: string) => {
  const { data } = await adminSupabase
    .from('events')
    .select('*, sessions(*)')
    .eq('slug', slug)
    .eq('status', 'published')
    .order('sort_order', { referencedTable: 'sessions' })
    .single()
  return data
})

export async function generateMetadata({ params }: Params) {
  const { slug } = await params
  const event = await getEvent(slug)
  if (!event) return { title: 'Event not found — CalDrop' }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const firstSession = (event as EventWithSessions).sessions?.[0]
  const dateStr = firstSession
    ? new Date(firstSession.start_at).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        timeZone: event.timezone,
      })
    : ''

  const description =
    event.description ??
    (dateStr
      ? `Join us on ${dateStr}. Add to your calendar with one click.`
      : 'Add this event to your calendar.')

  return {
    title: `${event.title} — CalDrop`,
    description,
    openGraph: {
      title: event.title,
      description,
      url: `${appUrl}/e/${slug}`,
      type: 'website',
      siteName: 'CalDrop',
    },
    twitter: { card: 'summary', title: event.title, description },
  }
}

export default async function PublicEventPage({ params }: Params) {
  const { slug } = await params
  const event = await getEvent(slug)
  if (!event) notFound()

  return (
    <div className="min-h-screen bg-background">
      <TrackView eventId={(event as EventWithSessions).id} />
      <PublicEventView
        event={event as EventWithSessions}
        appUrl={process.env.NEXT_PUBLIC_APP_URL ?? ''}
      />
    </div>
  )
}
