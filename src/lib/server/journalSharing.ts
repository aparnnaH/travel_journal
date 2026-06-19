import type { SupabaseClient } from '@supabase/supabase-js';
import { decodeJournalContentWithCanva } from '@/lib/journalCanvaPayload';
import { placeholderCountries } from '@/lib/placeholderData';
import type { JournalEntry } from '@/types';
import type { JournalComment } from '@/types/journalComments';
import type { JournalSharePermission, JournalShareRecipient, SharedJournalEntry } from '@/types/journalSharing';

type JournalEntryRow = {
  id: string;
  user_id: string;
  country_id: string;
  title: string;
  content?: string | null;
  mood: JournalEntry['mood'];
  tags?: string[];
  canva_design_id?: string | null;
  canva_design_title?: string | null;
  canva_design_edit_url?: string | null;
  canva_pages?: string[] | null;
  canva_page_count?: number | null;
  trip_start_date?: string | null;
  trip_end_date?: string | null;
  created_at: string;
  updated_at: string;
};

type JournalShareRow = {
  id: string;
  journal_entry_id: string;
  shared_by: string;
  shared_with: string;
  permission: JournalSharePermission;
  created_at: string;
};

type ProfileRow = {
  id: string;
  email: string;
  display_name?: string | null;
  avatar_url?: string | null;
};

type JournalCommentRow = {
  id: string;
  journal_entry_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

type JournalSearchScope = 'all' | 'title' | 'country' | 'tag' | 'text';

type JournalSearchableEntry = {
  country_id?: string | null;
  countryId?: string | null;
  title?: string | null;
  content?: string | null;
  tags?: string[] | null;
};

type SharedEntryQueryOptions = {
  limit?: number | null;
  offset?: number;
  summary?: boolean;
  search?: string;
  searchScope?: JournalSearchScope;
};

const normalizeSearchValue = (value: string) => value.trim().toLocaleLowerCase();

const getCountrySearchValues = (countryId?: string | null) => {
  const cleanCountryId = countryId?.trim();

  if (!cleanCountryId) {
    return [];
  }

  const country = placeholderCountries.find(
    (candidate) =>
      candidate.id.toLocaleLowerCase() === cleanCountryId.toLocaleLowerCase() ||
      candidate.code.toLocaleLowerCase() === cleanCountryId.toLocaleLowerCase()
  );

  return [cleanCountryId, country?.name, country?.code].filter((value): value is string => Boolean(value));
};

const entryMatchesSearch = (entry: JournalSearchableEntry, rawSearch: string, scope: JournalSearchScope) => {
  const search = normalizeSearchValue(rawSearch);

  if (!search) {
    return true;
  }

  const decodedContent = decodeJournalContentWithCanva(String(entry.content || '')).content;
  const searchableValues = {
    title: [entry.title ?? ''],
    country: getCountrySearchValues(entry.country_id ?? entry.countryId),
    tag: entry.tags ?? [],
    text: [decodedContent],
  };

  const matches = (values: string[]) =>
    values.some((value) => normalizeSearchValue(value).includes(search));

  if (scope === 'all') {
    return Object.values(searchableValues).some(matches);
  }

  return matches(searchableValues[scope]);
};

function mapEntry(
  row: JournalEntryRow,
  options: { summary?: boolean } = {}
): JournalEntry & { country_id: string; created_at: string; isSummary?: boolean } {
  const decodedContent = decodeJournalContentWithCanva(String(row.content || ''));
  const fallbackCanva = decodedContent.canva;
  const fallbackPages = fallbackCanva?.pages ?? [];
  const canvaPages = options.summary ? [] : row.canva_pages ?? fallbackPages;
  const content = options.summary
    ? decodedContent.content.trim().slice(0, 360)
    : decodedContent.content;

  return {
    id: row.id,
    userId: row.user_id,
    countryId: row.country_id,
    country_id: row.country_id,
    title: row.title,
    content,
    mood: row.mood,
    tags: row.tags ?? [],
    photos: [],
    canvaDesignId: row.canva_design_id ?? fallbackCanva?.designId ?? null,
    canvaDesignTitle: row.canva_design_title ?? fallbackCanva?.designTitle ?? null,
    canvaDesignEditUrl: row.canva_design_edit_url ?? fallbackCanva?.designEditUrl ?? null,
    canvaPages,
    canvaPageCount: row.canva_page_count ?? row.canva_pages?.length ?? fallbackPages.length ?? null,
    coverPhoto: options.summary ? null : fallbackCanva?.coverPhoto ?? fallbackPages[0] ?? row.canva_pages?.[0] ?? null,
    coverPageIndex: options.summary ? null : fallbackCanva?.coverPageIndex ?? null,
    tripStartDate: row.trip_start_date ?? fallbackCanva?.tripStartDate ?? null,
    tripEndDate: row.trip_end_date ?? fallbackCanva?.tripEndDate ?? null,
    insertedPhotos: options.summary ? [] : fallbackCanva?.insertedPhotos ?? [],
    canva_design_id: row.canva_design_id ?? fallbackCanva?.designId ?? null,
    canva_design_title: row.canva_design_title ?? fallbackCanva?.designTitle ?? null,
    canva_design_edit_url: row.canva_design_edit_url ?? fallbackCanva?.designEditUrl ?? null,
    canva_pages: canvaPages,
    canva_page_count: row.canva_page_count ?? row.canva_pages?.length ?? fallbackPages.length ?? null,
    trip_start_date: row.trip_start_date ?? fallbackCanva?.tripStartDate ?? null,
    trip_end_date: row.trip_end_date ?? fallbackCanva?.tripEndDate ?? null,
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    isSummary: options.summary ? true : undefined,
  };
}

function summarizeMappedEntry<T extends JournalEntry & { canva_pages?: string[] | null; isSummary?: boolean }>(entry: T) {
  return {
    ...entry,
    content: String(entry.content || '').trim().slice(0, 360),
    canvaPages: [],
    canva_pages: [],
    coverPhoto: null,
    insertedPhotos: [],
    isSummary: true,
  };
}

function mapProfile(profile?: ProfileRow) {
  return {
    id: profile?.id ?? '',
    email: profile?.email ?? 'Unknown traveler',
    displayName: profile?.display_name ?? undefined,
    avatar: profile?.avatar_url ?? undefined,
  };
}

function mapComment(row: JournalCommentRow, profiles: Map<string, ProfileRow>): JournalComment {
  return {
    id: row.id,
    journalEntryId: row.journal_entry_id,
    authorId: row.author_id,
    body: row.body,
    createdAt: row.created_at,
    author: mapProfile(profiles.get(row.author_id)),
  };
}

export async function getOwnedJournalEntry(supabaseAdmin: SupabaseClient, entryId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from('journal_entries')
    .select('*')
    .eq('id', entryId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as JournalEntryRow | null;
}

export async function canAccessJournalEntry(supabaseAdmin: SupabaseClient, entryId: string, userId: string) {
  const ownedEntry = await getOwnedJournalEntry(supabaseAdmin, entryId, userId);

  if (ownedEntry) {
    return true;
  }

  const { data, error } = await supabaseAdmin
    .from('journal_shares')
    .select('id')
    .eq('journal_entry_id', entryId)
    .eq('shared_with', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export async function getAcceptedFriendIds(supabaseAdmin: SupabaseClient, userId: string) {
  const { data, error } = await supabaseAdmin
    .from('friendships')
    .select('requester_id,addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  if (error) {
    throw new Error(error.message);
  }

  return new Set(
    (data ?? []).map((friendship) =>
      String(friendship.requester_id) === userId ? String(friendship.addressee_id) : String(friendship.requester_id)
    )
  );
}

export async function loadJournalShareRecipients(supabaseAdmin: SupabaseClient, entryId: string, sharedBy: string) {
  const { data, error } = await supabaseAdmin
    .from('journal_shares')
    .select('*')
    .eq('journal_entry_id', entryId)
    .eq('shared_by', sharedBy)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const shares = (data ?? []) as JournalShareRow[];
  const recipientIds = shares.map((share) => share.shared_with);

  if (recipientIds.length === 0) {
    return [];
  }

  const { data: profiles, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id,email,display_name,avatar_url')
    .in('id', recipientIds);

  if (profileError) {
    throw new Error(profileError.message);
  }

  const profileLookup = new Map((profiles ?? []).map((profile) => [String(profile.id), profile as ProfileRow]));

  return shares.map<JournalShareRecipient>((share) => ({
    ...mapProfile(profileLookup.get(share.shared_with)),
    permission: share.permission,
    sharedAt: share.created_at,
  }));
}

export async function replaceJournalShares({
  entryId,
  friendIds,
  permission,
  sharedBy,
  supabaseAdmin,
}: {
  entryId: string;
  friendIds: string[];
  permission: JournalSharePermission;
  sharedBy: string;
  supabaseAdmin: SupabaseClient;
}) {
  const uniqueFriendIds = [...new Set(friendIds)].filter((friendId) => friendId !== sharedBy);
  const acceptedFriendIds = await getAcceptedFriendIds(supabaseAdmin, sharedBy);
  const invalidFriendIds = uniqueFriendIds.filter((friendId) => !acceptedFriendIds.has(friendId));

  if (invalidFriendIds.length > 0) {
    throw new Error('You can only share journal entries with accepted friends.');
  }

  const { error: deleteError } = await supabaseAdmin
    .from('journal_shares')
    .delete()
    .eq('journal_entry_id', entryId)
    .eq('shared_by', sharedBy);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (uniqueFriendIds.length > 0) {
    const { error: insertError } = await supabaseAdmin.from('journal_shares').insert(
      uniqueFriendIds.map((friendId) => ({
        journal_entry_id: entryId,
        shared_by: sharedBy,
        shared_with: friendId,
        permission,
      }))
    );

    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  return loadJournalShareRecipients(supabaseAdmin, entryId, sharedBy);
}

export async function loadSharedJournalEntries(
  supabaseAdmin: SupabaseClient,
  userId: string,
  options: SharedEntryQueryOptions = {}
) {
  const limit = options.limit ?? null;
  const offset = options.offset ?? 0;
  const summary = options.summary ?? false;
  const search = options.search?.trim() ?? '';
  const searchScope = options.searchScope ?? 'all';
  let sharesQuery = supabaseAdmin
    .from('journal_shares')
    .select('*', { count: 'exact' })
    .eq('shared_with', userId)
    .order('created_at', { ascending: false });

  if (!search && limit) {
    sharesQuery = sharesQuery.range(offset, offset + limit - 1);
  }

  const { data, error, count } = await sharesQuery;

  if (error) {
    throw new Error(error.message);
  }

  const shares = (data ?? []) as JournalShareRow[];

  if (shares.length === 0) {
    return { data: [], count: count ?? 0, hasMore: false };
  }

  const entryIds = [...new Set(shares.map((share) => share.journal_entry_id))];
  const ownerIds = [...new Set(shares.map((share) => share.shared_by))];

  const [{ data: entryData, error: entryError }, { data: profileData, error: profileError }] = await Promise.all([
    supabaseAdmin.from('journal_entries').select('*').in('id', entryIds),
    supabaseAdmin.from('profiles').select('id,email,display_name,avatar_url').in('id', ownerIds),
  ]);

  if (entryError) {
    throw new Error(entryError.message);
  }

  if (profileError) {
    throw new Error(profileError.message);
  }

  const entryLookup = new Map((entryData ?? []).map((entry) => [String(entry.id), entry as JournalEntryRow]));
  const profileLookup = new Map((profileData ?? []).map((profile) => [String(profile.id), profile as ProfileRow]));

  const sharedEntries = shares.flatMap<SharedJournalEntry>((share) => {
    const entry = entryLookup.get(share.journal_entry_id);

    if (!entry) {
      return [];
    }

    return [
      {
        ...mapEntry(entry, { summary: summary && !search }),
        sharedBy: mapProfile(profileLookup.get(share.shared_by)),
        sharedAt: share.created_at,
        permission: share.permission,
      },
    ];
  });

  if (search) {
    const filteredEntries = sharedEntries.filter((entry) => entryMatchesSearch(entry, search, searchScope));
    const pagedEntries = limit ? filteredEntries.slice(offset, offset + limit) : filteredEntries;

    return {
      data: summary ? pagedEntries.map((entry) => summarizeMappedEntry(entry)) : pagedEntries,
      count: filteredEntries.length,
      hasMore: limit ? offset + pagedEntries.length < filteredEntries.length : false,
    };
  }

  return {
    data: sharedEntries,
    count: count ?? sharedEntries.length,
    hasMore: limit ? offset + sharedEntries.length < (count ?? sharedEntries.length) : false,
  };
}

export async function loadSharedJournalEntry(
  supabaseAdmin: SupabaseClient,
  userId: string,
  entryId: string
) {
  const { data: shareData, error: shareError } = await supabaseAdmin
    .from('journal_shares')
    .select('*')
    .eq('shared_with', userId)
    .eq('journal_entry_id', entryId)
    .maybeSingle();

  if (shareError) {
    throw new Error(shareError.message);
  }

  const share = shareData as JournalShareRow | null;

  if (!share) {
    return null;
  }

  const [{ data: entryData, error: entryError }, { data: profileData, error: profileError }] = await Promise.all([
    supabaseAdmin.from('journal_entries').select('*').eq('id', entryId).maybeSingle(),
    supabaseAdmin.from('profiles').select('id,email,display_name,avatar_url').eq('id', share.shared_by).maybeSingle(),
  ]);

  if (entryError) {
    throw new Error(entryError.message);
  }

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (!entryData) {
    return null;
  }

  return {
    ...mapEntry(entryData as JournalEntryRow),
    sharedBy: mapProfile((profileData ?? undefined) as ProfileRow | undefined),
    sharedAt: share.created_at,
    permission: share.permission,
  };
}

export async function loadJournalComments(supabaseAdmin: SupabaseClient, entryId: string, userId: string) {
  const canAccess = await canAccessJournalEntry(supabaseAdmin, entryId, userId);

  if (!canAccess) {
    throw new Error('Journal entry not found.');
  }

  const { data, error } = await supabaseAdmin
    .from('journal_share_comments')
    .select('*')
    .eq('journal_entry_id', entryId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as JournalCommentRow[];
  const authorIds = [...new Set(rows.map((row) => row.author_id))];

  if (authorIds.length === 0) {
    return [];
  }

  const { data: profiles, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id,email,display_name,avatar_url')
    .in('id', authorIds);

  if (profileError) {
    throw new Error(profileError.message);
  }

  const profileLookup = new Map((profiles ?? []).map((profile) => [String(profile.id), profile as ProfileRow]));
  return rows.map((row) => mapComment(row, profileLookup));
}

export async function createJournalComment({
  body,
  entryId,
  supabaseAdmin,
  userId,
}: {
  body: string;
  entryId: string;
  supabaseAdmin: SupabaseClient;
  userId: string;
}) {
  const cleanBody = body.trim();

  if (!cleanBody) {
    throw new Error('Write a comment before sending.');
  }

  if (cleanBody.length > 1000) {
    throw new Error('Comments must be 1000 characters or fewer.');
  }

  const canAccess = await canAccessJournalEntry(supabaseAdmin, entryId, userId);

  if (!canAccess) {
    throw new Error('Journal entry not found.');
  }

  const { data, error } = await supabaseAdmin
    .from('journal_share_comments')
    .insert({
      journal_entry_id: entryId,
      author_id: userId,
      body: cleanBody,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const { data: profiles, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id,email,display_name,avatar_url')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  return mapComment(data as JournalCommentRow, new Map([[userId, profiles as ProfileRow]]));
}
