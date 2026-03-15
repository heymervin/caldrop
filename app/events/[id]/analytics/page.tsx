// app/events/[id]/analytics/page.tsx
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

const PLATFORM_LABELS: Record<string, string> = {
  google: 'Google Calendar',
  apple: 'Apple Calendar',
  outlook: 'Outlook',
  yahoo: 'Yahoo Calendar',
  office365: 'Office 365',
  ics: 'ICS Download',
}

export default async function AnalyticsPage({ params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: event } = await supabase
    .from('events')
    .select('id, title, slug, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!event) notFound()

  const { data: rows } = await supabase
    .from('analytics')
    .select('type, platform, created_at')
    .eq('event_id', id)
    .order('created_at', { ascending: false })
    .limit(1000)

  const analytics = rows ?? []

  const totalViews = analytics.filter((r) => r.type === 'view').length
  const calendarAdds = analytics.filter((r) => r.type === 'calendar_add')
  const totalCalendarAdds = calendarAdds.length

  const conversionRate =
    totalViews === 0
      ? '—'
      : `${Math.min(100, Math.round((totalCalendarAdds / totalViews) * 100))}%`

  const platformCounts: Record<string, number> = {}
  for (const row of calendarAdds) {
    if (row.platform) {
      platformCounts[row.platform] = (platformCounts[row.platform] ?? 0) + 1
    }
  }

  const platformRows = Object.entries(platformCounts)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div className="space-y-1">
        <Link
          href={`/events/${id}/edit`}
          className="text-sm text-muted-foreground hover:underline"
        >
          &larr; Back to edit
        </Link>
        <h1 className="text-2xl font-bold">{event.title} — Analytics</h1>
      </div>

      {analytics.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center">
          No analytics yet. Share your event to start collecting data.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="border rounded-lg px-4 py-5 space-y-1">
              <p className="text-sm text-muted-foreground">Total Views</p>
              <p className="text-3xl font-semibold">{totalViews}</p>
            </div>
            <div className="border rounded-lg px-4 py-5 space-y-1">
              <p className="text-sm text-muted-foreground">Calendar Adds</p>
              <p className="text-3xl font-semibold">{totalCalendarAdds}</p>
            </div>
            <div className="border rounded-lg px-4 py-5 space-y-1">
              <p className="text-sm text-muted-foreground">Conversion Rate</p>
              <p className="text-3xl font-semibold">{conversionRate}</p>
            </div>
          </div>

          {platformRows.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold">Platform Breakdown</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Platform</th>
                    <th className="pb-2 font-medium text-right">Clicks</th>
                  </tr>
                </thead>
                <tbody>
                  {platformRows.map(([platform, count]) => (
                    <tr key={platform} className="border-b last:border-0">
                      <td className="py-2">
                        {PLATFORM_LABELS[platform] ?? platform}
                      </td>
                      <td className="py-2 text-right">{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Data is updated in real-time.
          </p>
        </>
      )}
    </div>
  )
}
