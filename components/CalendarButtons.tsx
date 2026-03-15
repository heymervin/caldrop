'use client'

import {
  googleCalendarUrl,
  yahooCalendarUrl,
  office365Url,
  sessionToCalendarParams,
} from '@/lib/caldrop/calendar-urls'
import type { EventWithSessions, Session } from '@/types/caldrop'

interface CalendarButtonsProps {
  event: EventWithSessions
  session?: Session
}

function trackCalendarAdd(eventId: string, platform: string) {
  fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_id: eventId, type: 'calendar_add', platform }),
  }).catch(() => {})
}

const buttonClass =
  'inline-flex items-center justify-center rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground'

export function CalendarButtons({ event, session }: CalendarButtonsProps) {
  if (event.sessions.length === 0) return null

  const isMultiSession = !session && event.sessions.length > 1
  const icsUrl = `/api/e/${event.slug}/ics`

  if (isMultiSession) {
    return (
      <div className="flex flex-wrap gap-2">
        <a
          href={icsUrl}
          className={buttonClass}
          onClick={() => trackCalendarAdd(event.id, 'apple')}
        >
          Apple Calendar
        </a>
        <a
          href={icsUrl}
          className={buttonClass}
          onClick={() => trackCalendarAdd(event.id, 'ics')}
        >
          Download .ics
        </a>
      </div>
    )
  }

  const targetSession = session ?? event.sessions[0]
  const params = sessionToCalendarParams(targetSession, event)
  const outlookUrl = office365Url(params)
  const office365UrlValue = outlookUrl.replace('outlook.office.com', 'outlook.office365.com')

  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={googleCalendarUrl(params)}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClass}
        onClick={() => trackCalendarAdd(event.id, 'google')}
      >
        Google Calendar
      </a>
      <a
        href={icsUrl}
        className={buttonClass}
        onClick={() => trackCalendarAdd(event.id, 'apple')}
      >
        Apple Calendar
      </a>
      <a
        href={outlookUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClass}
        onClick={() => trackCalendarAdd(event.id, 'outlook')}
      >
        Outlook
      </a>
      <a
        href={yahooCalendarUrl(params)}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClass}
        onClick={() => trackCalendarAdd(event.id, 'yahoo')}
      >
        Yahoo Calendar
      </a>
      <a
        href={office365UrlValue}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClass}
        onClick={() => trackCalendarAdd(event.id, 'office365')}
      >
        Office365
      </a>
      <a
        href={icsUrl}
        className={buttonClass}
        onClick={() => trackCalendarAdd(event.id, 'ics')}
      >
        Download .ics
      </a>
    </div>
  )
}
