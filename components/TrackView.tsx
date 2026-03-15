'use client'

import { useEffect } from 'react'

interface TrackViewProps {
  eventId: string
  sessionId?: string
}

export function TrackView({ eventId, sessionId }: TrackViewProps) {
  useEffect(() => {
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId, type: 'view', session_id: sessionId }),
    }).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
