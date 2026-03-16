'use client'

import { useState, useMemo } from 'react'
import { Calendar, MapPin, Globe, X } from 'lucide-react'
import { CalendarButtons } from '@/components/CalendarButtons'
import { ShareEvent } from '@/components/ShareEvent'
import type { EventWithSessions, Session } from '@/types/caldrop'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tzAbbr(timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    }).formatToParts(new Date())
    return parts.find(p => p.type === 'timeZoneName')?.value ?? timezone
  } catch {
    return timezone
  }
}

function tzOffset(timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    }).formatToParts(new Date())
    return parts.find(p => p.type === 'timeZoneName')?.value ?? ''
  } catch {
    return ''
  }
}

function formatTime(session: Session, timezone: string): string {
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

function safeUrl(url: string | null): string | null {
  if (!url) return null
  return url.startsWith('http://') || url.startsWith('https://') ? url : null
}

const ALL_TIMEZONES: string[] = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((Intl as any).supportedValuesOf('timeZone') as string[]).sort()
  } catch {
    return ['UTC','America/New_York','America/Chicago','America/Los_Angeles',
      'America/Toronto','Europe/London','Europe/Paris','Asia/Tokyo',
      'Asia/Singapore','Australia/Sydney']
  }
})()

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface PublicEventViewProps {
  event: EventWithSessions
  appUrl: string
}

export function PublicEventView({ event, appUrl }: PublicEventViewProps) {
  const [selectedTz, setSelectedTz] = useState(event.timezone)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [query, setQuery] = useState('')

  const isSingleSession = event.sessions.length === 1
  const isLocalTz = selectedTz === event.timezone

  const filtered = useMemo(() => {
    if (!query) return ALL_TIMEZONES
    const q = query.toLowerCase().replace(/\s/g, '_')
    return ALL_TIMEZONES.filter(tz => tz.toLowerCase().includes(q))
  }, [query])

  function detectLocalTz() {
    try {
      const local = Intl.DateTimeFormat().resolvedOptions().timeZone
      setSelectedTz(local)
      setPickerOpen(false)
      setQuery('')
    } catch {}
  }

  const abbr = tzAbbr(selectedTz)
  const offset = tzOffset(selectedTz)

  return (
    <main className="mx-auto max-w-[640px] px-4 py-10 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight leading-snug">
          {event.title}
        </h1>

        {/* Timezone badge — clickable */}
        <div className="relative shrink-0">
          <button
            onClick={() => setPickerOpen(o => !o)}
            className="flex items-center gap-1.5 rounded-full border border-input px-3 py-1.5 text-xs text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors"
          >
            <Globe className="size-3" />
            <span className="hidden sm:inline">Time shown in</span>
            <span className="font-medium text-foreground">{abbr} / {offset}</span>
          </button>

          {pickerOpen && (
            <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-xl border bg-card shadow-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Change timezone
                </p>
                <button
                  onClick={() => { setPickerOpen(false); setQuery('') }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </div>

              <button
                onClick={detectLocalTz}
                className="w-full rounded-lg border border-dashed border-input px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              >
                Use my local timezone
              </button>

              <input
                type="text"
                placeholder="Search timezones..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoFocus
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              />

              <select
                value={selectedTz}
                onChange={e => { setSelectedTz(e.target.value); setPickerOpen(false); setQuery('') }}
                size={6}
                className="w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none"
              >
                {filtered.map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>

              {!isLocalTz && (
                <button
                  onClick={() => { setSelectedTz(event.timezone); setPickerOpen(false); setQuery('') }}
                  className="w-full text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
                >
                  Reset to event timezone ({tzAbbr(event.timezone)})
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {event.description && (
        <p className="text-muted-foreground leading-relaxed text-sm">
          {event.description}
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
          event={event}
          session={isSingleSession ? event.sessions[0] : undefined}
        />

        {!isSingleSession && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            Adds all sessions to your calendar. Each session can also be added individually below.
          </p>
        )}
      </div>

      {/* Sessions */}
      <div className="space-y-3">
        {event.sessions.map((session) => {
          const timeStr = formatTime(session, selectedTz)
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
                  <CalendarButtons event={event} session={session} variant="inline" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Share + footer */}
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <p className="text-sm font-semibold">Share this event</p>
        <ShareEvent url={`${appUrl}/e/${event.slug}`} title={event.title} />
      </div>

      <footer className="pt-1 text-center">
        <p className="text-xs text-muted-foreground">Powered by CalDrop</p>
      </footer>

    </main>
  )
}
