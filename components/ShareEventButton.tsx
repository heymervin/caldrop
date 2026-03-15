'use client'

import { useState } from 'react'

interface ShareEventButtonProps {
  url: string
  title: string
}

export function ShareEventButton({ url, title }: ShareEventButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleNative() {
    if (navigator.share) {
      await navigator.share({ title, url }).catch(() => {})
    } else {
      handleCopy()
    }
  }

  return (
    <button
      onClick={handleNative}
      className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
    >
      {copied ? '✓ Copied' : '↗ Share event'}
    </button>
  )
}
