-- Cloud copy of the user's scratch-map state.
-- Zustand/localStorage is the fast client source; this table makes map progress
-- available across devices for signed-in users.
create table if not exists public.map_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  scratch_percentage integer not null default 0 check (scratch_percentage between 0 and 100),
  visited_countries text[] not null default '{}',
  country_colors jsonb not null default '{}'::jsonb,
  country_labels jsonb not null default '{}'::jsonb,
  country_cities jsonb not null default '{}'::jsonb,
  last_updated timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.map_states enable row level security;

-- RLS keeps each map snapshot scoped to its auth user.
drop policy if exists "Users can view their map state" on public.map_states;
create policy "Users can view their map state"
  on public.map_states for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their map state" on public.map_states;
create policy "Users can create their map state"
  on public.map_states for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their map state" on public.map_states;
create policy "Users can update their map state"
  on public.map_states for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their map state" on public.map_states;
create policy "Users can delete their map state"
  on public.map_states for delete
  using (auth.uid() = user_id);
