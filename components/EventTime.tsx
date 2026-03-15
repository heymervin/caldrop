interface EventTimeProps {
  startsAt: string // UTC ISO
  endsAt: string   // UTC ISO
  timezone: string
}

export function EventTime({ startsAt, endsAt, timezone }: EventTimeProps) {
  const start = new Date(startsAt)
  const end = new Date(endsAt)

  const dateFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  const timeFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  const tzFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'short',
  })

  const tzParts = tzFmt.formatToParts(start)
  const tzAbbr = tzParts.find((p) => p.type === 'timeZoneName')?.value ?? timezone

  const dateStr = dateFmt.format(start)
  const startTime = timeFmt.format(start)
  const endTime = timeFmt.format(end)

  return (
    <span>
      {dateStr} · {startTime} – {endTime} ({tzAbbr})
    </span>
  )
}
