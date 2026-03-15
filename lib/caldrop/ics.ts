// lib/caldrop/ics.ts
import ical from 'ical-generator'
import type { EventWithSessions } from '@/types/caldrop'

export function buildICS(event: EventWithSessions): string {
  const cal = ical({ name: event.title })

  for (const session of event.sessions) {
    cal.createEvent({
      start: new Date(session.start_at),
      end: new Date(session.end_at),
      summary: session.title
        ? `${event.title} — ${session.title}`
        : event.title,
      description: [
        event.description,
        session.meeting_url ? `Join: ${session.meeting_url}` : null,
      ]
        .filter(Boolean)
        .join('\n\n'),
      location: session.meeting_url ?? undefined,
      timezone: event.timezone,
    })
  }

  return cal.toString()
}
