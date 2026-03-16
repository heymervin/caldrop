// app/dashboard/page.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/lib/button-variants'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type EventRow = {
  id: string
  slug: string
  title: string
  status: 'draft' | 'published'
  created_at: string
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError) console.error('[dashboard] auth error:', authError.message)
  if (!user) redirect('/login')

  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id, slug, title, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  if (eventsError) console.error('[dashboard] events error:', eventsError.message, eventsError.code)

  const rows = (events ?? []) as EventRow[]

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Events</h1>
        <Link href="/events/new" className={buttonVariants()}>
          New Event
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <p className="text-muted-foreground">You haven&apos;t created any events yet.</p>
          <Link href="/events/new" className={buttonVariants({ size: 'lg' })}>
            Create your first event
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((event) => {
            const formattedDate = new Date(event.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })

            return (
              <li
                key={event.id}
                className="border rounded-lg px-4 py-3 flex items-center justify-between gap-4"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{event.title}</span>
                    <Badge variant={event.status === 'published' ? 'default' : 'secondary'}>
                      {event.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Created {formattedDate}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/events/${event.id}/edit`}
                    className={buttonVariants({ variant: 'outline', size: 'sm' })}
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/events/${event.id}/analytics`}
                    className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                  >
                    Analytics
                  </Link>
                  {event.status === 'published' && (
                    <Link
                      href={`/e/${event.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
                    >
                      View
                    </Link>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <footer className="mt-12 pt-6 border-t text-center">
        <p className="text-xs text-muted-foreground">
          Want a custom app made for you?{' '}
          <a
            href="https://heymervin.me"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            heymervin.me
          </a>
        </p>
      </footer>
    </div>
  )
}
