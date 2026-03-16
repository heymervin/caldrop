'use client'

import { Download } from 'lucide-react'
import {
  googleCalendarUrl,
  yahooCalendarUrl,
  office365Url,
  sessionToCalendarParams,
} from '@/lib/caldrop/calendar-urls'
import type { EventWithSessions, Session } from '@/types/caldrop'

function trackCalendarAdd(eventId: string, platform: string) {
  fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_id: eventId, type: 'calendar_add', platform }),
  }).catch(() => {})
}

// ---------------------------------------------------------------------------
// Flat monochrome platform icons
// ---------------------------------------------------------------------------

function PlatformIcon({ platform }: { platform: string }) {
  const cls = 'size-4 shrink-0'
  switch (platform) {
    case 'google':
      return (
        <svg className={cls} viewBox="0 0 16 16" fill="none" aria-hidden>
          <path fillRule="evenodd" clipRule="evenodd"
            d="M15 8.2c0-.6-.05-1.18-.14-1.73H8v3.27h3.93c-.17.9-.69 1.66-1.46 2.17v1.8h2.36C14.2 12.55 15 10.54 15 8.2z"
            fill="currentColor" opacity=".9"/>
          <path fillRule="evenodd" clipRule="evenodd"
            d="M8 15c1.97 0 3.62-.65 4.83-1.77l-2.36-1.8c-.66.44-1.5.7-2.47.7-1.9 0-3.5-1.28-4.08-3H1.52v1.86A7 7 0 008 15z"
            fill="currentColor" opacity=".65"/>
          <path fillRule="evenodd" clipRule="evenodd"
            d="M3.92 8.9A4.1 4.1 0 013.7 8c0-.32.06-.63.15-.9V5.24H1.52A7 7 0 001 8c0 1.13.27 2.2.52 2.76l2.4-1.86z"
            fill="currentColor" opacity=".45"/>
          <path fillRule="evenodd" clipRule="evenodd"
            d="M8 3.87c1.07 0 2.03.37 2.79 1.09l2.09-2.08A7 7 0 008 1a7 7 0 00-6.48 4.24l2.4 1.87C4.5 5.15 6.1 3.87 8 3.87z"
            fill="currentColor" opacity=".75"/>
        </svg>
      )
    case 'apple':
      return (
        <svg className={cls} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
          <path d="M10.5 2.3c.45-.6.8-1.3.85-1.8-.55.07-1.31.5-1.8 1.03-.44.49-.85 1.25-.8 1.77.6.02 1.3-.42 1.75-1z"/>
          <path d="M12.2 5.1C11.54 4.67 10.76 4.5 9.96 4.5c-1 0-1.72.38-2.27.62-.42.2-.78.38-1.17.38-.41 0-.8-.18-1.27-.38C4.74 4.9 4.06 4.5 3.16 4.5c-1.5 0-2.6 1.5-2.6 3.38 0 2.73 1.7 6.62 3.04 6.62.48 0 .92-.28 1.43-.54.57-.3 1.22-.58 1.9-.58.7 0 1.32.26 1.9.56.53.27.99.54 1.46.54 1.46-.02 2.75-4.03 2.75-6.6 0-1.37-.76-2.26-1.84-2.78z"/>
        </svg>
      )
    case 'outlook':
      return (
        <svg className={cls} viewBox="0 0 16 16" fill="none" aria-hidden>
          <rect x="1.5" y="4.5" width="8" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity=".12"/>
          <path d="M1.5 6.5l4 2.5 4-2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          <rect x="7" y="2" width="7.5" height="5.5" rx="1" fill="currentColor" fillOpacity=".35"/>
          <path d="M7 2.5l3.75 2.5L14.5 2.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    case 'yahoo':
      return (
        <svg className={cls} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
          <path d="M1 2h3.2l2.8 5 2.8-5H13L7.6 9.6V14H6V9.6L1 2z"/>
          <circle cx="12" cy="12" r="2"/>
        </svg>
      )
    case 'office365':
      return (
        <svg className={cls} viewBox="0 0 16 16" fill="none" aria-hidden>
          <rect x="1" y="1" width="6.5" height="6.5" rx=".75" fill="currentColor"/>
          <rect x="8.5" y="1" width="6.5" height="6.5" rx=".75" fill="currentColor" opacity=".65"/>
          <rect x="1" y="8.5" width="6.5" height="6.5" rx=".75" fill="currentColor" opacity=".65"/>
          <rect x="8.5" y="8.5" width="6.5" height="6.5" rx=".75" fill="currentColor" opacity=".35"/>
        </svg>
      )
    default:
      return <Download className={cls} />
  }
}

// ---------------------------------------------------------------------------
// Platform config
// ---------------------------------------------------------------------------

const PLATFORMS = [
  { key: 'google',    label: 'Google',        type: 'online'   },
  { key: 'apple',     label: 'Apple',         type: 'desktop'  },
  { key: 'outlook',   label: 'Outlook',       type: 'desktop'  },
  { key: 'yahoo',     label: 'Yahoo',         type: 'online'   },
  { key: 'office365', label: 'Office365',     type: 'online'   },
  { key: 'ics',       label: 'Other Calendar', type: null      },
] as const

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CalendarButtonsProps {
  event: EventWithSessions
  session?: Session
  /** grid = 3-col card buttons (default). inline = small pill row. */
  variant?: 'grid' | 'inline'
}

export function CalendarButtons({ event, session, variant = 'grid' }: CalendarButtonsProps) {
  if (event.sessions.length === 0) return null

  const icsUrl = `/api/e/${event.slug}/ics`
  const isMultiSession = !session && event.sessions.length > 1

  function getUrl(platform: string): string {
    if (platform === 'apple' || platform === 'ics') return icsUrl
    if (isMultiSession) return icsUrl
    const target = session ?? event.sessions[0]
    const params = sessionToCalendarParams(target, event)
    if (platform === 'google')    return googleCalendarUrl(params)
    if (platform === 'yahoo')     return yahooCalendarUrl(params)
    if (platform === 'outlook')   return office365Url(params)
    if (platform === 'office365') return office365Url(params).replace('outlook.office.com', 'outlook.office365.com')
    return icsUrl
  }

  const isDownload = (k: string) => k === 'apple' || k === 'ics'

  if (variant === 'inline') {
    return (
      <div className="flex flex-wrap gap-1.5">
        {PLATFORMS.map(({ key, label, type }) => (
          <a
            key={key}
            href={getUrl(key)}
            target={isDownload(key) ? undefined : '_blank'}
            rel="noopener noreferrer"
            onClick={() => trackCalendarAdd(event.id, key)}
            className="inline-flex items-center gap-1.5 rounded-md border border-input px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            <PlatformIcon platform={key} />
            <span>{label}</span>
            {type && <span className="opacity-40">({type})</span>}
          </a>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {PLATFORMS.map(({ key, label, type }) => (
        <a
          key={key}
          href={getUrl(key)}
          target={isDownload(key) ? undefined : '_blank'}
          rel="noopener noreferrer"
          onClick={() => trackCalendarAdd(event.id, key)}
          className="flex items-center gap-2.5 rounded-lg border border-input bg-background px-3 py-2.5 text-sm hover:bg-accent hover:border-foreground/20 transition-colors"
        >
          <PlatformIcon platform={key} />
          <span className="leading-tight">
            <span className="font-medium">{label}</span>
            {type && (
              <span className="block text-[11px] text-muted-foreground">({type})</span>
            )}
          </span>
        </a>
      ))}
    </div>
  )
}
