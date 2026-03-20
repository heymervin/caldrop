# caldrop

Event scheduling tool with one-click calendar add and shareable links.

[Live Demo](https://caldrop.vercel.app)

## Overview

CalDrop lets you create events, generate shareable links, and let attendees add the event to their preferred calendar in one click. It handles timezone conversion automatically and tracks engagement analytics per event. A free tier supports up to 3 events; a paid tier removes the limit.

## Features

- Event creation with multiple sessions and full timezone support
- One-click add to Google, Apple, Outlook, Yahoo, and Office 365 calendars
- ICS file download for any calendar client
- Shareable event links with unique URL slugs
- Analytics dashboard tracking views, calendar adds, conversion rate, and platform breakdown
- Share via Twitter/X, WhatsApp, and email
- Free tier (3 events) and paid tier

## Stack

| Technology | Purpose |
|-----------|---------|
| Next.js 16 + React 19 + TypeScript | Full-stack framework |
| Supabase (PostgreSQL + Auth + SSR) | Database and server-side authentication |
| Tailwind CSS 4 | Styling |
| shadcn/ui | UI component library |
| ical-generator | ICS file generation |
| Upstash Redis | Rate limiting (optional) |
| Vercel | Hosting |

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
git clone https://github.com/heymervin/caldrop.git
cd caldrop
cp .env.example .env.local
npm install
npm run dev
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side) |
| `NEXT_PUBLIC_APP_URL` | Public app URL for shareable links |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL (optional, for rate limiting) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token (optional) |

## Project Structure

```
app/                   # Next.js App Router
├── api/               # API route handlers
├── auth/              # Auth callback routes
├── dashboard/         # User dashboard
├── e/[slug]/          # Public event pages
├── events/            # Event management
└── login/             # Authentication pages
components/            # 11 shared components and shadcn/ui primitives
lib/
├── caldrop/           # calendar-urls, ics, slug, tiers utilities
└── supabase/          # admin, client, and server Supabase clients
types/                 # TypeScript type definitions
```
