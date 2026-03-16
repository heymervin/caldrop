import { cache } from 'react'
import { notFound } from 'next/navigation'
import { Calendar, MapPin, Globe } from 'lucide-react'
import { adminSupabase } from '@/lib/supabase/admin'
import { TrackView } from '@/components/TrackView'
import { CalendarButtons } from '@/components/CalendarButtons'
import { ShareEventButton } from '@/components/ShareEventButton'
import type { EventWithSessions, Session } from '@/types/caldrop'

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

function formatSessionTime(session: Session, timezone: string) {
  const dateFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const timeFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  const start = new Date(session.start_at)
  const end = new Date(session.end_at)
  return `${dateFmt.format(start)}, ${timeFmt.format(start)} – ${timeFmt.format(end)}`
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  // Timezone abbreviation for the badge
  const tzParts = new Intl.DateTimeFormat('en-US', {
    timeZone: typedEvent.timezone,
    timeZoneName: 'shortOffset',
  }).formatToParts(new Date())
  const tzOffset = tzParts.find(p => p.type === 'timeZoneName')?.value ?? typedEvent.timezone
  const tzShort = new Intl.DateTimeFormat('en-US', {
    timeZone: typedEvent.timezone,
    timeZoneName: 'short',
  }).formatToParts(new Date()).find(p => p.type === 'timeZoneName')?.value ?? typedEvent.timezone

  return (
    <div className="min-h-screen bg-background">
      <TrackView eventId={typedEvent.id} />
      <main className="mx-auto max-w-[640px] px-4 py-10 space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight leading-snug">
            {typedEvent.title}
          </h1>
          <div className="shrink-0 flex items-center gap-1.5 rounded-full border border-input px-3 py-1.5 text-xs text-muted-foreground whitespace-nowrap">
            <Globe className="size-3" />
            <span className="hidden sm:inline">Time shown in</span>
            <span className="font-medium text-foreground">{tzShort} / {tzOffset}</span>
          </div>
        </div>

        {typedEvent.description && (
          <p className="text-muted-foreground leading-relaxed text-sm">
            {typedEvent.description}
          </p>
        )}

        {/* Add to calendar */}
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">
              {isSingleSession ? 'Add to Calendar' : 'Subscribe to Calendar'}
            </h2>
          </div>

          <CalendarButtons
            event={typedEvent}
            session={isSingleSession ? typedEvent.sessions[0] : undefined}
          />

          {!isSingleSession && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              By subscribing to this calendar, you&apos;ll receive all sessions in one go.
              Each session can also be added individually below.
            </p>
          )}
        </div>

        {/* Sessions */}
        <div className="space-y-3">
          {typedEvent.sessions.map((session) => {
            const timeStr = formatSessionTime(session, typedEvent.timezone)
            const url = safeUrl(session.meeting_url)

            return (
              <div key={session.id} className="rounded-xl border bg-card overflow-hidden">
                <div className="px-5 py-4 space-y-2.5">
                  {!isSingleSession && session.title && (
                    <p className="font-semibold text-sm">{session.title}</p>
                  )}

                  <div className="flex items-start gap-2.5 text-sm">
                    <Calendar className="size-4 mt-px text-muted-foreground shrink-0" />
                    <span>{timeStr}</span>
                  </div>

                  {url ? (
                    <div className="flex items-start gap-2.5 text-sm">
                      <MapPin className="size-4 mt-px text-muted-foreground shrink-0" />
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline-offset-4 hover:underline break-all"
                      >
                        {session.meeting_url}
                      </a>
                    </div>
                  ) : session.meeting_url ? (
                    <div className="flex items-start gap-2.5 text-sm">
                      <MapPin className="size-4 mt-px text-muted-foreground shrink-0" />
                      <span className="break-all text-muted-foreground">{session.meeting_url}</span>
                    </div>
                  ) : null}
                </div>

                {!isSingleSession && (
                  <div className="border-t px-5 py-3 bg-muted/30">
                    <p className="text-[11px] text-muted-foreground mb-2 uppercase tracking-wide font-medium">
                      Add this session
                    </p>
                    <CalendarButtons event={typedEvent} session={session} variant="inline" />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t">
          <ShareEventButton
            url={`${appUrl}/e/${typedEvent.slug}`}
            title={typedEvent.title}
          />
          <p className="text-xs text-muted-foreground">Powered by CalDrop</p>
        </div>

      </main>
    </div>
  )
}
