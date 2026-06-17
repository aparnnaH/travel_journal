import type { SupabaseClient } from '@supabase/supabase-js';
import type { JournalEntry } from '@/types';
import type { JournalSharePermission, JournalShareRecipient, SharedJournalEntry } from '@/types/journalSharing';

type JournalEntryRow = {
  id: string;
  user_id: string;
  country_id: string;
  title: string;
  content: string;
  mood: JournalEntry['mood'];
  tags?: string[];
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

function mapEntry(row: JournalEntryRow): JournalEntry & { country_id: string; created_at: string } {
  return {
    id: row.id,
    userId: row.user_id,
    countryId: row.country_id,
    country_id: row.country_id,
    title: row.title,
    content: row.content,
    mood: row.mood,
    tags: row.tags ?? [],
    photos: [],
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
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

export async function loadSharedJournalEntries(supabaseAdmin: SupabaseClient, userId: string) {
  const { data, error } = await supabaseAdmin
    .from('journal_shares')
    .select('*')
    .eq('shared_with', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const shares = (data ?? []) as JournalShareRow[];

  if (shares.length === 0) {
    return [];
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

  return shares.flatMap<SharedJournalEntry>((share) => {
    const entry = entryLookup.get(share.journal_entry_id);

    if (!entry) {
      return [];
    }

    return [
      {
        ...mapEntry(entry),
        sharedBy: mapProfile(profileLookup.get(share.shared_by)),
        sharedAt: share.created_at,
        permission: share.permission,
      },
    ];
  });
}
