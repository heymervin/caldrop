// lib/caldrop/calendar-urls.ts
import type { Session, CalDropEvent } from '@/types/caldrop'

export interface CalendarParams {
  title: string
  description: string
  location: string
  start: Date
  end: Date
}

function toGoogleDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

export function googleCalendarUrl(p: CalendarParams): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: p.title,
    details: p.description,
    location: p.location,
    dates: `${toGoogleDate(p.start)}/${toGoogleDate(p.end)}`,
  })
  return `https://calendar.google.com/calendar/render?${params}`
}

export function yahooCalendarUrl(p: CalendarParams): string {
  const params = new URLSearchParams({
    v: '60',
    title: p.title,
    desc: p.description,
    in_loc: p.location,
    st: toGoogleDate(p.start),
    et: toGoogleDate(p.end),
  })
  return `https://calendar.yahoo.com/?${params}`
}

export function office365Url(p: CalendarParams): string {
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: p.title,
    body: p.description,
    location: p.location,
    startdt: p.start.toISOString(),
    enddt: p.end.toISOString(),
  })
  return `https://outlook.office.com/calendar/deeplink/compose?${params}`
}

export function sessionToCalendarParams(
  session: Session,
  event: Pick<CalDropEvent, 'title' | 'description'>
): CalendarParams {
  return {
    title: session.title ? `${event.title} — ${session.title}` : event.title,
    description: event.description ?? '',
    location: session.meeting_url ?? '',
    start: new Date(session.start_at),
    end: new Date(session.end_at),
  }
}
