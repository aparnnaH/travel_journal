-- Structured Canva metadata for journal entries.
-- The app still supports legacy content-embedded metadata, but these columns are
-- the preferred storage for Canva-backed entries.
alter table public.journal_entries
  add column if not exists canva_design_id text,
  add column if not exists canva_design_title text,
  add column if not exists canva_design_edit_url text,
  add column if not exists canva_pages jsonb not null default '[]'::jsonb,
  add column if not exists canva_page_count integer;

create index if not exists journal_entries_canva_design_id_idx
  on public.journal_entries (canva_design_id)
  where canva_design_id is not null;
