import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ShareEvent } from '@/components/ShareEvent'
import { buttonVariants } from '@/lib/button-variants'

type Params = { params: Promise<{ id: string }> }

export default async function SharePage({ params }: Params) {
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

  if (!event) redirect('/dashboard')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const publicUrl = `${appUrl}/e/${event.slug}`

  return (
    <div className="max-w-lg mx-auto px-4 py-16 space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Your event is live!</h1>
        <p className="text-muted-foreground">Share the link so people can add it to their calendar.</p>
      </div>

      <ShareEvent url={publicUrl} title={event.title} />

      <div className="flex gap-3 pt-2">
        <Link href={`/events/${event.id}/edit`} className={buttonVariants({ variant: 'outline' })}>
          Edit event
        </Link>
        <Link href="/dashboard" className={buttonVariants({ variant: 'ghost' })}>
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
