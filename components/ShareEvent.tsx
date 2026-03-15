'use client'

import { useState } from 'react'
import { Link2, Twitter, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ShareEventProps {
  url: string
  title: string
}

export function ShareEvent({ url, title }: ShareEventProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleNativeShare() {
    if (navigator.share) {
      await navigator.share({ title, url }).catch(() => {})
    }
  }

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${title} — add it to your calendar:`)}&url=${encodeURIComponent(url)}`
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${title} — add it to your calendar: ${url}`)}`
  const mailtoUrl = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`Join me for ${title}!\n\nAdd it to your calendar: ${url}`)}`

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-lg border bg-muted px-3 py-2">
        <span className="flex-1 text-sm font-mono truncate text-muted-foreground">{url}</span>
        <Button type="button" size="sm" variant="outline" onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <Button type="button" size="sm" variant="outline" onClick={handleNativeShare}>
            <Link2 className="size-3.5 mr-1" /> Share
          </Button>
        )}
        <a href={twitterUrl} target="_blank" rel="noopener noreferrer">
          <Button type="button" size="sm" variant="outline">
            <Twitter className="size-3.5 mr-1" /> X / Twitter
          </Button>
        </a>
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
          <Button type="button" size="sm" variant="outline">
            WhatsApp
          </Button>
        </a>
        <a href={mailtoUrl}>
          <Button type="button" size="sm" variant="outline">
            <Mail className="size-3.5 mr-1" /> Email
          </Button>
        </a>
      </div>
    </div>
  )
}
