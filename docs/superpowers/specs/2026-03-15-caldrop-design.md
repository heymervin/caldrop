# CalDrop — Design Spec
**Date:** 2026-03-15
**Stack:** Next.js + Supabase

---

## Overview

CalDrop is a calendar event sharing tool. Creators build an event page with one or more sessions, publish it, and share a link. Attendees open the link and add the event to any calendar — Google, Apple, Outlook, Yahoo, Office365, or `.ics` download. No RSVP, no attendee accounts required.

Comparable to AddCal (addcal.co) but with a cleaner free tier and multi-session support from the start.

---

## User Flows

### Creator
1. Visit caldrop.co → sign in with Google or magic link (email OTP)
2. Dashboard → "Create Event"
3. Fill in: title, description, timezone, and one or more sessions (each with date, start/end time, meeting URL)
4. Publish → receive a shareable URL: `caldrop.co/e/abc123`
5. View analytics: page views + calendar add clicks per event

### Attendee
1. Open shared link — no login required
2. See event title, description, session list, meeting links
3. Choose calendar platform → event added to their calendar
4. Time displayed in attendee's local timezone

---

## Data Model

### users
| column | type | notes |
|---|---|---|
| id | uuid | Supabase Auth user id |
| email | text | |
| plan | text | `free` or `paid` |
| stripe_customer_id | text | nullable; set when user first initiates a paid subscription |
| stripe_subscription_id | text | nullable; set on active subscription |
| created_at | timestamptz | |

### events
| column | type | notes |
|---|---|---|
| id | uuid | |
| user_id | uuid | FK → users |
| title | text | |
| description | text | optional |
| slug | text | unique, 8-char alphanumeric [a-z0-9]; DB UNIQUE constraint + application-layer retry on collision |
| timezone | text | IANA timezone string |
| status | text | `draft` or `published`; only `published` events are accessible at `/e/[slug]`; drafts count against free tier limit |
| created_at | timestamptz | |
| updated_at | timestamptz | updated on any field change |

### sessions
| column | type | notes |
|---|---|---|
| id | uuid | |
| event_id | uuid | FK → events |
| title | text | optional, e.g. "Session 1" |
| start_at | timestamptz | |
| end_at | timestamptz | |
| meeting_url | text | optional — may be absent for in-person or TBD events |
| sort_order | integer | controls display order on event page |
| created_at | timestamptz | |
| updated_at | timestamptz | updated on any field change |

### analytics
| column | type | notes |
|---|---|---|
| id | uuid | |
| event_id | uuid | FK → events |
| type | text | `view` or `calendar_add` |
| platform | text | nullable; only set when `type = calendar_add`: `google`, `apple`, `outlook`, `yahoo`, `office365`, `ics` |
| session_id | uuid | nullable FK → sessions; set on `calendar_add` for multi-session events to track per-session popularity |
| created_at | timestamptz | |

No personal attendee data is stored — analytics are aggregate counts only.

---

## Tiers

### Free
- Max 3 events (enforced in `POST /api/events` — count ALL events for the user regardless of status, including drafts)
- CalDrop branding on public event page
- Analytics: last 30 days only

### Paid (Stripe, future)
- Unlimited events
- Remove CalDrop branding
- Custom logo + brand color on public page
- Full analytics history

---

## Pages & Routes

### Public
| route | description |
|---|---|
| `/e/[slug]` | Shareable event page — calendar buttons, session list, meeting links |

### Auth
| route | description |
|---|---|
| `/login` | Google OAuth + magic link sign-in |

### App (authenticated)
| route | description |
|---|---|
| `/dashboard` | Creator's event list with view/click counts |
| `/events/new` | Create event form |
| `/events/[id]/edit` | Edit event and sessions |
| `/events/[id]/analytics` | View/click breakdown by calendar platform |

### API
| route | method | auth | description |
|---|---|---|---|
| `/api/events` | POST | required | Create event + initial sessions |
| `/api/events/[id]` | GET | required | Fetch event + sessions (used by edit page) |
| `/api/events/[id]` | PATCH | required | Update event fields |
| `/api/events/[id]` | DELETE | required | Delete event and all sessions |
| `/api/events/[id]/sessions` | POST | required | Add a session to an event |
| `/api/events/[id]/sessions/[sessionId]` | PATCH | required | Update a session |
| `/api/events/[id]/sessions/[sessionId]` | DELETE | required | Remove a session |
| `/api/e/[slug]/ics` | GET | public | Generate and serve `.ics` file — public, no auth required |
| `/api/analytics/track` | POST | public | Record a view or calendar_add event — public, no auth required |

---

## Technical Details

### Calendar Integration
- **Google Calendar** — URL-based redirect with event params (no file)
- **Yahoo / Office365** — URL-based links
- **Apple / Outlook / Other** — `.ics` file generated server-side via `ical-generator`
- Multi-session events generate a single `.ics` with multiple VEVENT entries

### Slugs
- Short random alphanumeric strings generated on event creation (e.g. `abc123`)
- No creator username in URL

### Analytics
- Page load → POST to `/api/analytics/track` with `type: view`
- Calendar button click → POST with `type: calendar_add` + platform, then redirect
- No cookies, no fingerprinting — server-side counts only
- Rate limiting on `/api/analytics/track`: max 5 requests per IP per event per minute — implemented via Upstash Redis in Next.js middleware; `event_id` is validated to exist before any insert
- Per-session tracking: URL-based calendar adds (Google, Yahoo, Office365) track `session_id` when the button clicked is associated with a specific session; `.ics` download (all sessions bundled) records `session_id: null` since it covers the full event

### Authentication & RLS
- Supabase Auth: Google OAuth + magic link (email OTP)
- Row Level Security on all tables:
  - `events`: all operations require `auth.uid() = user_id`
  - `sessions`: all mutation routes (`POST /api/events/[id]/sessions`, `PATCH`, `DELETE`) validate `event.user_id = auth.uid()` in the API handler before touching the DB
  - `analytics`: INSERT is open to `anon` role but the API handler validates `event_id` exists before inserting; SELECT requires `auth.uid()` matching the owning event's `user_id`
- Publishing constraint: `PATCH /api/events/[id]` rejects a `status: published` update if the event has zero sessions
- Event deletion: application-layer cascade — API handler deletes sessions first, then analytics rows, then the event (no DB-level cascade to keep deletes explicit and auditable)

### Timezone Handling
- Creator sets timezone on event creation (IANA string)
- Public page detects attendee's local timezone and displays time accordingly
- "Time shown in X / GMT+Y" indicator displayed on event page

---

## Out of Scope (v1)
- RSVPs / attendee tracking
- Custom domains
- Team members / shared access
- Embeddable calendar widget
- Zapier / webhook integrations
- Email reminders
