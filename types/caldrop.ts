// types/caldrop.ts

export type Plan = 'free' | 'paid'
export type EventStatus = 'draft' | 'published'
export type AnalyticsType = 'view' | 'calendar_add'
export type CalendarPlatform = 'google' | 'apple' | 'outlook' | 'yahoo' | 'office365' | 'ics'

export interface CalDropUser {
  id: string
  email: string
  plan: Plan
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  created_at: string
}

export interface CalDropEvent {
  id: string
  user_id: string
  title: string
  description: string | null
  slug: string
  timezone: string
  status: EventStatus
  created_at: string
  updated_at: string
}

export interface Session {
  id: string
  event_id: string
  title: string | null
  start_at: string
  end_at: string
  meeting_url: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface AnalyticsRow {
  id: string
  event_id: string
  session_id: string | null
  type: AnalyticsType
  platform: CalendarPlatform | null
  created_at: string
}

export interface EventWithSessions extends CalDropEvent {
  sessions: Session[]
}

export interface EventSummary extends CalDropEvent {
  session_count: number
  view_count: number
  add_count: number
}
