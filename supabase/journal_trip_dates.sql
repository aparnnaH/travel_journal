-- Adds date-range metadata so a journal entry can describe a multi-day trip
-- instead of only relying on created_at.
alter table public.journal_entries
  add column if not exists trip_start_date date,
  add column if not exists trip_end_date date;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'journal_entries_trip_date_order'
      and conrelid = 'public.journal_entries'::regclass
  ) then
    alter table public.journal_entries
      add constraint journal_entries_trip_date_order
      check (
        trip_start_date is null
        or trip_end_date is null
        or trip_end_date >= trip_start_date
      ) not valid;
  end if;
end $$;

alter table public.journal_entries
  validate constraint journal_entries_trip_date_order;

create index if not exists journal_entries_trip_start_date_idx
  on public.journal_entries (trip_start_date)
  where trip_start_date is not null;
