create table if not exists public.canva_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  canva_user_id text,
  canva_team_id text,
  access_token_encrypted text not null,
  refresh_token_encrypted text not null,
  expires_at timestamptz not null,
  scopes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.canva_connections enable row level security;

drop policy if exists "Users can view their Canva connection" on public.canva_connections;
create policy "Users can view their Canva connection"
  on public.canva_connections
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their Canva connection" on public.canva_connections;
create policy "Users can delete their Canva connection"
  on public.canva_connections
  for delete
  using (auth.uid() = user_id);

create index if not exists canva_connections_expires_at_idx
  on public.canva_connections (expires_at);

