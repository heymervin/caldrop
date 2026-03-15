-- supabase/migrations/001_caldrop_schema.sql

-- Users (extends Supabase auth.users)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  plan text not null default 'free' check (plan in ('free', 'paid')),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now()
);

-- Events
create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  slug text not null unique check (slug ~ '^[a-z0-9]{8}$'),
  timezone text not null default 'UTC',
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index events_user_id_idx on public.events(user_id);
create index events_slug_idx on public.events(slug);

-- Sessions
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  title text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  meeting_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sessions_event_id_idx on public.sessions(event_id);

-- Analytics
create table public.analytics (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  type text not null check (type in ('view', 'calendar_add')),
  platform text check (platform in ('google', 'apple', 'outlook', 'yahoo', 'office365', 'ics')),
  created_at timestamptz not null default now()
);

create index analytics_event_id_idx on public.analytics(event_id);
create index analytics_created_at_idx on public.analytics(created_at);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger events_updated_at before update on public.events
  for each row execute function update_updated_at();

create trigger sessions_updated_at before update on public.sessions
  for each row execute function update_updated_at();

-- Auto-create user profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- RLS
alter table public.users enable row level security;
alter table public.events enable row level security;
alter table public.sessions enable row level security;
alter table public.analytics enable row level security;

-- Users: read/update own profile only
create policy "users_self" on public.users
  for all using (auth.uid() = id);

-- Events: owner full access
create policy "events_owner" on public.events
  for all using (auth.uid() = user_id);

-- Events: anon can read published events (for public event page)
create policy "events_public_read" on public.events
  for select to anon using (status = 'published');

-- Sessions: owner full access via event ownership
create policy "sessions_owner" on public.sessions
  for all using (
    exists (
      select 1 from public.events
      where id = sessions.event_id and user_id = auth.uid()
    )
  );

-- Sessions: anon can read sessions of published events
create policy "sessions_public_read" on public.sessions
  for select to anon using (
    exists (
      select 1 from public.events
      where id = sessions.event_id and status = 'published'
    )
  );

-- Analytics: owner can read
create policy "analytics_select" on public.analytics
  for select using (
    exists (
      select 1 from public.events
      where id = analytics.event_id and user_id = auth.uid()
    )
  );

-- Note: analytics inserts are done via service role client in the API route
-- to avoid exposing the anon insert permission broadly.
