-- Curated entries that the portfolio demo shows in "Shared with me".
-- Writes should go through the server-only /api/demo/publish route.
create table if not exists public.demo_shared_journal_entries (
  id text primary key,
  source_entry_id uuid not null,
  published_by uuid not null,
  title text not null,
  entry_payload jsonb not null,
  comments_payload jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists demo_shared_journal_entries_updated_idx
  on public.demo_shared_journal_entries (updated_at desc);

alter table public.demo_shared_journal_entries enable row level security;
