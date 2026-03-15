'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { EventWithSessions } from '@/types/caldrop'

// ---------------------------------------------------------------------------
// Datetime helpers
// ---------------------------------------------------------------------------

function toUTCIso(localDatetimeStr: string, timezone: string): string {
  // localDatetimeStr is "YYYY-MM-DDTHH:mm" representing wall-clock time in `timezone`
  // We need to find the UTC instant that corresponds to that wall-clock time.
  //
  // Strategy: construct a Date by appending a zero offset, then compute the difference
  // between how that UTC instant appears in `timezone` vs what the user typed.
  // Apply the difference as a correction to get the true UTC value.
  const [datePart, timePart] = localDatetimeStr.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = (timePart ?? '00:00').split(':').map(Number)

  // Step 1: Treat the input as UTC to get an initial guess
  let guess = Date.UTC(year, month - 1, day, hour, minute)

  // Step 2: Find what that UTC instant looks like in the target timezone
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })

  function toLocal(utcMs: number): string {
    const parts = fmt.formatToParts(new Date(utcMs))
    const get = (type: string) => parts.find(p => p.type === type)?.value ?? '00'
    return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
  }

  // Step 3: Compute the difference between the displayed local time and what the user typed
  const displayed = toLocal(guess)
  const displayedDate = new Date(displayed + 'Z') // parse as UTC for arithmetic
  const inputDate = new Date(localDatetimeStr + 'Z')
  const diffMs = inputDate.getTime() - displayedDate.getTime()

  // Step 4: Apply correction — one iteration is sufficient for all non-ambiguous times
  const corrected = new Date(guess + diffMs)
  return corrected.toISOString()
}

function isoToLocalDatetime(isoString: string, timezone: string): string {
  const date = new Date(isoString)
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SessionDraft {
  _key: string          // stable React render key, never sent to API
  id?: string           // undefined for new sessions
  title: string
  start_at: string      // datetime-local string "YYYY-MM-DDTHH:MM"
  end_at: string        // datetime-local string
  meeting_url: string
}

interface EventFormProps {
  event?: EventWithSessions
}

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
]

function emptySession(): SessionDraft {
  return { _key: crypto.randomUUID(), title: '', start_at: '', end_at: '', meeting_url: '' }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EventForm({ event }: EventFormProps) {
  const router = useRouter()
  const isEdit = !!event

  const [title, setTitle] = useState(event?.title ?? '')
  const [description, setDescription] = useState(event?.description ?? '')
  const [timezone, setTimezone] = useState(event?.timezone ?? 'UTC')

  const [sessions, setSessions] = useState<SessionDraft[]>(() => {
    if (event?.sessions?.length) {
      return event.sessions.map((s) => ({
        _key: s.id,
        id: s.id,
        title: s.title ?? '',
        start_at: isoToLocalDatetime(s.start_at, event.timezone),
        end_at: isoToLocalDatetime(s.end_at, event.timezone),
        meeting_url: s.meeting_url ?? '',
      }))
    }
    return [emptySession()]
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [unpublishing, setUnpublishing] = useState(false)

  // -------------------------------------------------------------------------
  // Session helpers
  // -------------------------------------------------------------------------

  function updateSession(index: number, patch: Partial<SessionDraft>) {
    setSessions((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  function addSession() {
    setSessions((prev) => [...prev, emptySession()])
  }

  function removeSession(index: number) {
    if (sessions.length <= 1) return
    setSessions((prev) => prev.filter((_, i) => i !== index))
  }

  // -------------------------------------------------------------------------
  // Submit
  // -------------------------------------------------------------------------

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      if (!isEdit) {
        // Create new event
        const res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            description: description || null,
            timezone,
            sessions: sessions.map((s) => ({
              title: s.title || null,
              start_at: toUTCIso(s.start_at, timezone),
              end_at: toUTCIso(s.end_at, timezone),
              meeting_url: s.meeting_url || null,
            })),
          }),
        })
        if (!res.ok) {
          const body = await res.json()
          throw new Error(body.error ?? 'Failed to create event')
        }
        const created = await res.json()
        router.push(`/events/${created.id}/edit`)
        return
      }

      // Edit existing event: PATCH event fields
      const eventPatch: Record<string, unknown> = {}
      if (title !== event.title) eventPatch.title = title
      if ((description || null) !== event.description) eventPatch.description = description || null
      if (timezone !== event.timezone) eventPatch.timezone = timezone

      if (Object.keys(eventPatch).length > 0) {
        const res = await fetch(`/api/events/${event.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventPatch),
        })
        if (!res.ok) {
          const body = await res.json()
          throw new Error(body.error ?? 'Failed to update event')
        }
      }

      // Reconcile sessions
      const originalIds = new Set(event.sessions.map((s) => s.id))
      const currentIds = new Set(sessions.filter((s) => s.id).map((s) => s.id!))

      // Delete removed sessions
      for (const originalSession of event.sessions) {
        if (!currentIds.has(originalSession.id)) {
          const res = await fetch(`/api/events/${event.id}/sessions/${originalSession.id}`, {
            method: 'DELETE',
          })
          if (!res.ok) {
            setError('Failed to save sessions. Please try again.')
            return
          }
        }
      }

      // Add new or patch existing sessions
      for (let i = 0; i < sessions.length; i++) {
        const s = sessions[i]
        const startUtc = toUTCIso(s.start_at, timezone)
        const endUtc = toUTCIso(s.end_at, timezone)

        if (!s.id) {
          // New session
          const res = await fetch(`/api/events/${event.id}/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: s.title || null,
              start_at: startUtc,
              end_at: endUtc,
              meeting_url: s.meeting_url || null,
              sort_order: i,
            }),
          })
          if (!res.ok) {
            setError('Failed to save sessions. Please try again.')
            return
          }
        } else if (originalIds.has(s.id)) {
          // Existing session — check if changed
          const original = event.sessions.find((o) => o.id === s.id)!
          const originalStart = isoToLocalDatetime(original.start_at, event.timezone)
          const originalEnd = isoToLocalDatetime(original.end_at, event.timezone)
          const changed =
            s.title !== (original.title ?? '') ||
            s.start_at !== originalStart ||
            s.end_at !== originalEnd ||
            s.meeting_url !== (original.meeting_url ?? '')

          if (changed) {
            const res = await fetch(`/api/events/${event.id}/sessions/${s.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: s.title || null,
                start_at: startUtc,
                end_at: endUtc,
                meeting_url: s.meeting_url || null,
                sort_order: i,
              }),
            })
            if (!res.ok) {
              setError('Failed to save sessions. Please try again.')
              return
            }
          }
        }
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function handlePublish() {
    setPublishing(true)
    setError(null)
    try {
      const res = await fetch(`/api/events/${event!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published' }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Failed to publish')
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setPublishing(false)
    }
  }

  async function handleUnpublish() {
    setUnpublishing(true)
    setError(null)
    try {
      const res = await fetch(`/api/events/${event!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft' }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Failed to unpublish')
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setUnpublishing(false)
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const hasSessions = sessions.length > 0 && sessions.some((s) => s.start_at && s.end_at)

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isEdit ? 'Edit Event' : 'New Event'}</h1>

        {isEdit && (
          <div className="flex items-center gap-2">
            {event.status === 'draft' ? (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handlePublish}
                disabled={publishing || !hasSessions}
              >
                {publishing ? 'Publishing...' : 'Publish'}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUnpublish}
                disabled={unpublishing}
              >
                {unpublishing ? 'Unpublishing...' : 'Unpublish'}
              </Button>
            )}
          </div>
        )}
      </div>

      {isEdit && event.status === 'published' && (
        <div className="rounded-lg bg-muted px-4 py-3 text-sm">
          <span className="text-muted-foreground">Public URL: </span>
          <a
            href={`/e/${event.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-primary underline-offset-4 hover:underline"
          >
            /e/{event.slug}
          </a>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Section 1: Event Details */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold">Event Details</h2>

        <div className="space-y-1.5">
          <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. React Workshop 2025"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description ?? ''}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="timezone">Timezone</Label>
          <select
            id="timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Section 2: Sessions */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold">Sessions</h2>

        <div className="space-y-4">
          {sessions.map((session, index) => (
            <div
              key={session._key}
              className="rounded-lg border px-4 py-4 space-y-3 relative"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Session {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeSession(index)}
                  disabled={sessions.length <= 1}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed text-lg leading-none"
                  aria-label="Remove session"
                >
                  &times;
                </button>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`session-title-${index}`}>Session title</Label>
                <Input
                  id={`session-title-${index}`}
                  value={session.title}
                  onChange={(e) => updateSession(index, { title: e.target.value })}
                  placeholder="e.g. Day 1 — Morning"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`session-start-${index}`}>
                    Start <span className="text-destructive">*</span>
                  </Label>
                  <input
                    id={`session-start-${index}`}
                    type="datetime-local"
                    value={session.start_at}
                    onChange={(e) => updateSession(index, { start_at: e.target.value })}
                    required
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`session-end-${index}`}>
                    End <span className="text-destructive">*</span>
                  </Label>
                  <input
                    id={`session-end-${index}`}
                    type="datetime-local"
                    value={session.end_at}
                    onChange={(e) => updateSession(index, { end_at: e.target.value })}
                    required
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`session-url-${index}`}>Meeting URL / Location</Label>
                <Input
                  id={`session-url-${index}`}
                  value={session.meeting_url}
                  onChange={(e) => updateSession(index, { meeting_url: e.target.value })}
                  placeholder="https://zoom.us/j/..."
                />
              </div>
            </div>
          ))}
        </div>

        <Button type="button" variant="outline" size="sm" onClick={addSession}>
          + Add Session
        </Button>
      </section>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Event'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push('/dashboard')}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
