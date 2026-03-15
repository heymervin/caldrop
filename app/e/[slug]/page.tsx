import { cache } from 'react'
import { notFound } from 'next/navigation'
import { adminSupabase } from '@/lib/supabase/admin'
import { TrackView } from '@/components/TrackView'
import { EventTime } from '@/components/EventTime'
import { CalendarButtons } from '@/components/CalendarButtons'
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

function safeUrl(url: string | null): string | null {
  if (!url) return null
  return url.startsWith('https://') || url.startsWith('http://') ? url : null
}

export async function generateMetadata({ params }: Params) {
  const { slug } = await params
  const event = await getEvent(slug)
  if (!event) return { title: 'Event not found — CalDrop' }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const firstSession = (event as EventWithSessions).sessions?.[0]
  const dateStr = firstSession
    ? new Date(firstSession.start_at).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
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
    twitter: {
      card: 'summary',
      title: event.title,
      description,
    },
  }
}

export default async function PublicEventPage({ params }: Params) {
  const { slug } = await params

  const event = await getEvent(slug)

  if (!event) notFound()

  const typedEvent = event as EventWithSessions
  const isSingleSession = typedEvent.sessions.length === 1

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-[600px] px-4 py-12 space-y-8">
        <TrackView eventId={typedEvent.id} />

        {/* Event header */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">{typedEvent.title}</h1>
          {typedEvent.description && (
            <p className="text-muted-foreground leading-relaxed">{typedEvent.description}</p>
          )}
        </div>

        {isSingleSession ? (
          // Single-session layout
          <div className="space-y-6">
            <div className="rounded-xl border bg-card p-6 space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  When
                </p>
                <p className="text-base font-medium">
                  <EventTime
                    startsAt={typedEvent.sessions[0].start_at}
                    endsAt={typedEvent.sessions[0].end_at}
                    timezone={typedEvent.timezone}
                  />
                </p>
              </div>

              {safeUrl(typedEvent.sessions[0].meeting_url) ? (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Where
                  </p>
                  <a
                    href={safeUrl(typedEvent.sessions[0].meeting_url)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-base text-primary underline-offset-4 hover:underline break-all"
                  >
                    {typedEvent.sessions[0].meeting_url}
                  </a>
                </div>
              ) : typedEvent.sessions[0].meeting_url ? (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Where
                  </p>
                  <p className="text-base break-all">{typedEvent.sessions[0].meeting_url}</p>
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Add to calendar</p>
              <CalendarButtons event={typedEvent} session={typedEvent.sessions[0]} />
            </div>
          </div>
        ) : (
          // Multi-session layout
          <div className="space-y-6">
            {typedEvent.sessions.map((session) => (
              <div key={session.id} className="rounded-xl border bg-card p-6 space-y-4">
                <h2 className="text-lg font-semibold">
                  {session.title || typedEvent.title}
                </h2>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    When
                  </p>
                  <p className="text-base">
                    <EventTime
                      startsAt={session.start_at}
                      endsAt={session.end_at}
                      timezone={typedEvent.timezone}
                    />
                  </p>
                </div>

                {safeUrl(session.meeting_url) ? (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Where
                    </p>
                    <a
                      href={safeUrl(session.meeting_url)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-base text-primary underline-offset-4 hover:underline break-all"
                    >
                      {session.meeting_url}
                    </a>
                  </div>
                ) : session.meeting_url ? (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Where
                    </p>
                    <p className="text-base break-all">{session.meeting_url}</p>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Add to calendar</p>
                  <CalendarButtons event={typedEvent} session={session} />
                </div>
              </div>
            ))}

            {/* Add all sessions */}
            <div className="rounded-xl border bg-muted/40 p-6 space-y-3">
              <h2 className="text-base font-semibold">Add all sessions</h2>
              <CalendarButtons event={typedEvent} />
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">Powered by CalDrop</p>
        </footer>
      </main>
    </div>
  )
}
