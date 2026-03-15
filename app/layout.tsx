import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { SignOutButton } from '@/components/SignOutButton'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CalDrop',
  description: 'Share events. Any calendar.',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang="en">
      <body className={inter.className}>
        {user && (
          <header className="border-b px-4 h-12 flex items-center justify-between">
            <Link href="/dashboard" className="font-bold text-sm">
              CalDrop
            </Link>
            <SignOutButton />
          </header>
        )}
        {children}
      </body>
    </html>
  )
}
