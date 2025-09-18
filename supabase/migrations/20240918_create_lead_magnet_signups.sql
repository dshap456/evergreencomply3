create table if not exists public.lead_magnet_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source_slug text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create unique index if not exists lead_magnet_signups_email_source_idx
  on public.lead_magnet_signups (email, source_slug);

alter table public.lead_magnet_signups enable row level security;

create policy "Allow public inserts for lead magnet signups"
  on public.lead_magnet_signups
  for insert
  with check (true);
