'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { SignOutButton } from '@/components/SignOutButton'

export function Header() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setShow(!!user)
    })
  }, [])

  if (!show) return null

  return (
    <header className="border-b px-4 h-12 flex items-center justify-between">
      <Link href="/dashboard" className="font-bold text-sm">
        CalDrop
      </Link>
      <SignOutButton />
    </header>
  )
}
