create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'blocked')),
  blocked_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friendships_no_self_request check (requester_id <> addressee_id)
);

create unique index if not exists friendships_unique_pair
  on public.friendships (
    least(requester_id, addressee_id),
    greatest(requester_id, addressee_id)
  );

create index if not exists friendships_requester_idx on public.friendships(requester_id);
create index if not exists friendships_addressee_idx on public.friendships(addressee_id);
create index if not exists friendships_status_idx on public.friendships(status);

alter table public.friendships enable row level security;

drop policy if exists "Users can view their friendships" on public.friendships;
create policy "Users can view their friendships"
  on public.friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "Users can request friendships" on public.friendships;
create policy "Users can request friendships"
  on public.friendships for insert
  with check (auth.uid() = requester_id and requester_id <> addressee_id);

drop policy if exists "Users can update their friendships" on public.friendships;
create policy "Users can update their friendships"
  on public.friendships for update
  using (auth.uid() = requester_id or auth.uid() = addressee_id)
  with check (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "Users can delete their friendships" on public.friendships;
create policy "Users can delete their friendships"
  on public.friendships for delete
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create table if not exists public.journal_shares (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references public.journal_entries(id) on delete cascade,
  shared_by uuid not null references public.profiles(id) on delete cascade,
  shared_with uuid not null references public.profiles(id) on delete cascade,
  permission text not null default 'view' check (permission in ('view', 'comment')),
  created_at timestamptz not null default now(),
  constraint journal_shares_no_self_share check (shared_by <> shared_with)
);

create unique index if not exists journal_shares_unique_recipient
  on public.journal_shares(journal_entry_id, shared_with);

create index if not exists journal_shares_shared_by_idx on public.journal_shares(shared_by);
create index if not exists journal_shares_shared_with_idx on public.journal_shares(shared_with);
create index if not exists journal_shares_entry_idx on public.journal_shares(journal_entry_id);

alter table public.journal_shares enable row level security;

drop policy if exists "Users can view journal shares they participate in" on public.journal_shares;
create policy "Users can view journal shares they participate in"
  on public.journal_shares for select
  using (auth.uid() = shared_by or auth.uid() = shared_with);

drop policy if exists "Users can create journal shares" on public.journal_shares;
create policy "Users can create journal shares"
  on public.journal_shares for insert
  with check (auth.uid() = shared_by and shared_by <> shared_with);

drop policy if exists "Users can update journal shares they created" on public.journal_shares;
create policy "Users can update journal shares they created"
  on public.journal_shares for update
  using (auth.uid() = shared_by)
  with check (auth.uid() = shared_by);

drop policy if exists "Users can delete journal shares they created" on public.journal_shares;
create policy "Users can delete journal shares they created"
  on public.journal_shares for delete
  using (auth.uid() = shared_by);

create table if not exists public.journal_share_comments (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references public.journal_entries(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint journal_share_comments_body_length check (char_length(trim(body)) between 1 and 1000)
);

create index if not exists journal_share_comments_entry_idx on public.journal_share_comments(journal_entry_id);
create index if not exists journal_share_comments_author_idx on public.journal_share_comments(author_id);
create index if not exists journal_share_comments_created_idx on public.journal_share_comments(created_at);

alter table public.journal_share_comments enable row level security;

drop policy if exists "Users can view comments on accessible journal entries" on public.journal_share_comments;
create policy "Users can view comments on accessible journal entries"
  on public.journal_share_comments for select
  using (
    exists (
      select 1
      from public.journal_entries entry
      where entry.id = journal_share_comments.journal_entry_id
        and entry.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.journal_shares share
      where share.journal_entry_id = journal_share_comments.journal_entry_id
        and share.shared_with = auth.uid()
    )
  );

drop policy if exists "Users can comment on accessible journal entries" on public.journal_share_comments;
create policy "Users can comment on accessible journal entries"
  on public.journal_share_comments for insert
  with check (
    auth.uid() = author_id
    and (
      exists (
        select 1
        from public.journal_entries entry
        where entry.id = journal_share_comments.journal_entry_id
          and entry.user_id = auth.uid()
      )
      or exists (
        select 1
        from public.journal_shares share
        where share.journal_entry_id = journal_share_comments.journal_entry_id
          and share.shared_with = auth.uid()
      )
    )
  );

drop policy if exists "Users can delete their own journal comments" on public.journal_share_comments;
create policy "Users can delete their own journal comments"
  on public.journal_share_comments for delete
  using (auth.uid() = author_id);
