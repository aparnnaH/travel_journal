-- Remembers the user's Canva "Travel Journal" folder after it is created/found.
-- This avoids creating duplicate folders for every new Canva design.
alter table public.canva_connections
  add column if not exists travel_journal_folder_id text;

create index if not exists canva_connections_travel_journal_folder_id_idx
  on public.canva_connections (travel_journal_folder_id)
  where travel_journal_folder_id is not null;
