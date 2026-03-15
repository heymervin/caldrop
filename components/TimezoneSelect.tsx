'use client'

import { useState, useMemo } from 'react'

interface TimezoneSelectProps {
  value: string
  onChange: (tz: string) => void
}

// Build the full IANA timezone list, sorted alphabetically
const ALL_TIMEZONES: string[] = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (Intl as any).supportedValuesOf('timeZone').sort() as string[]
  } catch {
    // Fallback for environments that don't support this API
    return [
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
  }
})()

export function TimezoneSelect({ value, onChange }: TimezoneSelectProps) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query) return ALL_TIMEZONES
    const q = query.toLowerCase().replace(/\s/g, '_')
    return ALL_TIMEZONES.filter(tz => tz.toLowerCase().includes(q))
  }, [query])

  return (
    <div className="space-y-1">
      <input
        type="text"
        placeholder="Search timezones..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        size={6}
        className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50"
      >
        {filtered.map(tz => (
          <option key={tz} value={tz}>{tz}</option>
        ))}
      </select>
      <p className="text-xs text-muted-foreground">Selected: <strong>{value}</strong></p>
    </div>
  )
}
