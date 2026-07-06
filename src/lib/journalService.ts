// Client-side journal API wrapper.
// Keeping fetch calls here gives page components a stable, typed boundary for
// journal entries, sharing, shared entries, and comments.
import type { JournalEntry } from '@/types';
import type { JournalComment } from '@/types/journalComments';
import type { JournalShareRecipient, SharedJournalEntry } from '@/types/journalSharing';
import { sanitizeInstagramEmbedUrls } from '@/lib/instagramEmbeds';
import { encodeJournalContentWithCanva } from '@/lib/journalCanvaPayload';
import {
  createDefaultDemoJournalShares,
  DEMO_SHARE_RECIPIENT_ID,
  DEMO_SHARE_RECIPIENT_EMAIL,
  DEMO_SHARE_RECIPIENT_NAME,
  DEMO_USER_ID,
  isDemoMode,
  readDemoJournalComments,
  readDemoJournalEntries,
  readDemoJournalShares,
  readDemoSharedJournalEntriesLarge,
  writeDemoJournalComments,
  writeDemoJournalEntries,
  writeDemoJournalShares,
  writeDemoSharedJournalEntriesLarge,
} from '@/lib/demoMode';

const MAX_DEMO_INSERTED_JOURNAL_PHOTOS = 8;

const createDemoShareRecipient = (sharedAt: string): JournalShareRecipient => ({
  id: DEMO_SHARE_RECIPIENT_ID,
  email: DEMO_SHARE_RECIPIENT_EMAIL,
  displayName: DEMO_SHARE_RECIPIENT_NAME,
  permission: 'view',
  sharedAt,
});

async function parseJournalApiResponse<T>(response: Response, fallbackError: string): Promise<T & { success: boolean; error?: string }> {
  try {
    const payload = (await response.json()) as T & { success: boolean; error?: string };

    if (!response.ok) {
      return {
        ...payload,
        success: false,
        error: payload.error || fallbackError,
      };
    }

    return payload;
  } catch {
    return {
      success: false,
      error: fallbackError,
    } as T & { success: boolean; error?: string };
  }
}

// Fetches the current user's entries, optionally using pagination, summary mode,
// and server-supported search parameters.
export async function fetchJournalEntries(options?: {
  limit?: number;
  offset?: number;
  summary?: boolean;
  search?: string;
  searchScope?: 'all' | 'title' | 'country' | 'tag' | 'text';
}) {
  if (isDemoMode()) {
    const entries = readDemoJournalEntries();
    const search = options?.search?.trim().toLowerCase();
    const filteredEntries = search
      ? entries.filter((entry) =>
          [entry.title, entry.countryId, entry.content, ...(entry.tags ?? [])].some((value) =>
            value.toLowerCase().includes(search)
          )
        )
      : entries;
    const offset = options?.offset ?? 0;
    const pagedEntries =
      typeof options?.limit === 'number' ? filteredEntries.slice(offset, offset + options.limit) : filteredEntries;

    return {
      success: true,
      data: pagedEntries,
      count: filteredEntries.length,
      hasMore: typeof options?.limit === 'number' ? offset + pagedEntries.length < filteredEntries.length : false,
    };
  }

  const params = new URLSearchParams();

  if (typeof options?.limit === 'number') {
    params.set('limit', String(options.limit));
  }

  if (typeof options?.offset === 'number') {
    params.set('offset', String(options.offset));
  }

  if (options?.summary) {
    params.set('summary', 'true');
  }

  if (options?.search?.trim()) {
    params.set('search', options.search.trim());
    params.set('searchScope', options.searchScope ?? 'all');
  }

  const query = params.toString();
  const response = await fetch(`/api/journal${query ? `?${query}` : ''}`);

  return response.json() as Promise<{
    success: boolean;
    data?: JournalEntry[];
    count?: number;
    hasMore?: boolean;
    error?: string;
  }>;
}

// Fetches one owned journal entry by id.
export async function fetchJournalEntry(entryId: string) {
  if (isDemoMode()) {
    const entry = readDemoJournalEntries().find((item) => item.id === entryId);
    return entry
      ? { success: true, data: entry }
      : { success: false, error: 'Journal entry not found.' };
  }

  const response = await fetch(`/api/journal?entryId=${encodeURIComponent(entryId)}`);

  return response.json() as Promise<{
    success: boolean;
    data?: JournalEntry;
    error?: string;
  }>;
}

// Creates a journal entry. Canva and inserted-photo fields are optional because
// plain text entries and Canva-backed entries share the same endpoint.
export async function createJournalEntry(entry: {
  countryId: string;
  title: string;
  content: string;
  mood: string;
  tags: string[];
  canvaDesignId?: string;
  canvaDesignTitle?: string;
  canvaDesignEditUrl?: string;
  canvaPages?: string[];
  tripStartDate?: string;
  tripEndDate?: string;
  coverPhoto?: string | null;
  coverPageIndex?: number | null;
  insertedPhotos?: Array<{
    id: string;
    src: string;
    alt: string;
    caption?: string;
  }>;
  instagramEmbeds?: string[];
}) {
  if (isDemoMode()) {
    const now = new Date().toISOString();
    const cleanCanvaPages = entry.canvaPages?.filter((page) => page.startsWith('data:image/')) ?? [];
    const cleanCoverPhoto = entry.coverPhoto?.startsWith('data:image/') ? entry.coverPhoto : null;
    const cleanCoverPageIndex =
      typeof entry.coverPageIndex === 'number' && Number.isFinite(entry.coverPageIndex) && cleanCanvaPages.length
        ? Math.max(0, Math.min(cleanCanvaPages.length - 1, Math.floor(entry.coverPageIndex)))
        : null;
    const cleanInsertedPhotos =
      entry.insertedPhotos
        ?.filter((photo) => photo?.src?.startsWith('data:image/'))
        .slice(0, MAX_DEMO_INSERTED_JOURNAL_PHOTOS)
        .map((photo, index) => ({
          id: photo.id || `demo-photo-${index + 1}`,
          src: photo.src,
          alt: photo.alt || `Inserted photo ${index + 1}`,
          caption: photo.caption ?? '',
        })) ?? [];
    const cleanInstagramEmbeds = sanitizeInstagramEmbedUrls(entry.instagramEmbeds);
    const shouldEncodeMediaPayload = Boolean(
      cleanCanvaPages.length ||
        cleanCoverPhoto ||
        cleanCoverPageIndex !== null ||
        cleanInsertedPhotos.length ||
        cleanInstagramEmbeds.length
    );
    const content = shouldEncodeMediaPayload
      ? encodeJournalContentWithCanva(entry.content, {
          designId: entry.canvaDesignId ?? null,
          designTitle: entry.canvaDesignTitle ?? null,
          designEditUrl: entry.canvaDesignEditUrl ?? null,
          pages: cleanCanvaPages,
          coverPhoto: cleanCoverPhoto,
          coverPageIndex: cleanCoverPageIndex,
          insertedPhotos: cleanInsertedPhotos,
          tripStartDate: entry.tripStartDate ?? null,
          tripEndDate: entry.tripEndDate ?? null,
          instagramEmbeds: cleanInstagramEmbeds,
        })
      : entry.content;
    const newEntry: JournalEntry = {
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `demo-entry-${Date.now()}`,
      userId: DEMO_USER_ID,
      countryId: entry.countryId,
      title: entry.title,
      content,
      mood: entry.mood as JournalEntry['mood'],
      tags: entry.tags,
      photos: cleanInsertedPhotos.map((photo) => ({
        id: photo.id,
        url: photo.src,
        alt: photo.alt,
        uploadedAt: now,
      })),
      canvaDesignId: entry.canvaDesignId ?? null,
      canvaDesignTitle: entry.canvaDesignTitle ?? null,
      canvaDesignEditUrl: entry.canvaDesignEditUrl ?? null,
      canvaPages: cleanCanvaPages,
      canvaPageCount: cleanCanvaPages.length || null,
      coverPhoto: cleanCoverPhoto,
      coverPageIndex: cleanCoverPageIndex,
      insertedPhotos: cleanInsertedPhotos,
      instagramEmbeds: cleanInstagramEmbeds,
      tripStartDate: entry.tripStartDate ?? null,
      tripEndDate: entry.tripEndDate ?? null,
      createdAt: now,
      updatedAt: now,
    };

    writeDemoJournalEntries([newEntry, ...readDemoJournalEntries()]);
    writeDemoJournalShares({
      ...readDemoJournalShares(),
      [newEntry.id]: [DEMO_SHARE_RECIPIENT_ID],
    });
    return { success: true, data: newEntry };
  }

  const response = await fetch('/api/journal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });

  return response.json() as Promise<{ success: boolean; data?: JournalEntry; error?: string }>;
}

// Lightweight title-only update used by rename flows.
export async function updateJournalEntryTitle(entry: {
  entryId: string;
  title: string;
}) {
  if (isDemoMode()) {
    const entries = readDemoJournalEntries();
    const updatedEntries = entries.map((item) =>
      item.id === entry.entryId ? { ...item, title: entry.title, updatedAt: new Date().toISOString() } : item
    );
    writeDemoJournalEntries(updatedEntries);
    const updatedEntry = updatedEntries.find((item) => item.id === entry.entryId);
    return updatedEntry
      ? { success: true, data: updatedEntry }
      : { success: false, error: 'Journal entry not found.' };
  }

  const response = await fetch('/api/journal', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });

  return response.json() as Promise<{ success: boolean; data?: JournalEntry; error?: string }>;
}

// Full entry update used by edit flows where country/content/mood/tags can change.
export async function updateJournalEntry(entry: {
  entryId: string;
  countryId: string;
  title: string;
  content: string;
  mood: string;
  tags: string[];
  canvaDesignId?: string;
  canvaDesignTitle?: string;
  canvaDesignEditUrl?: string;
  canvaPages?: string[];
  tripStartDate?: string;
  tripEndDate?: string;
  coverPhoto?: string | null;
  coverPageIndex?: number | null;
  insertedPhotos?: Array<{
    id: string;
    src: string;
    alt: string;
    caption?: string;
  }>;
  instagramEmbeds?: string[];
}) {
  if (isDemoMode()) {
    const entries = readDemoJournalEntries();
    const updatedEntries = entries.map((item) =>
      {
        if (item.id !== entry.entryId) {
          return item;
        }

        const cleanCanvaPages = entry.canvaPages?.filter((page) => page.startsWith('data:image/')) ?? item.canvaPages ?? [];
        const cleanCoverPhoto = entry.coverPhoto?.startsWith('data:image/') ? entry.coverPhoto : item.coverPhoto ?? null;
        const cleanCoverPageIndex =
          typeof entry.coverPageIndex === 'number' && Number.isFinite(entry.coverPageIndex) && cleanCanvaPages.length
            ? Math.max(0, Math.min(cleanCanvaPages.length - 1, Math.floor(entry.coverPageIndex)))
            : item.coverPageIndex ?? null;
        const cleanInsertedPhotos =
          entry.insertedPhotos
            ?.filter((photo) => photo?.src?.startsWith('data:image/'))
            .slice(0, MAX_DEMO_INSERTED_JOURNAL_PHOTOS)
            .map((photo, index) => ({
              id: photo.id || `demo-photo-${index + 1}`,
              src: photo.src,
              alt: photo.alt || `Inserted photo ${index + 1}`,
              caption: photo.caption ?? '',
            })) ?? item.insertedPhotos ?? [];
        const cleanInstagramEmbeds = sanitizeInstagramEmbedUrls(entry.instagramEmbeds ?? item.instagramEmbeds);
        const shouldEncodeMediaPayload = Boolean(
          cleanCanvaPages.length ||
            cleanCoverPhoto ||
            cleanCoverPageIndex !== null ||
            cleanInsertedPhotos.length ||
            cleanInstagramEmbeds.length
        );

        return {
          ...item,
          countryId: entry.countryId,
          title: entry.title,
          content: shouldEncodeMediaPayload
            ? encodeJournalContentWithCanva(entry.content, {
                designId: entry.canvaDesignId ?? item.canvaDesignId ?? null,
                designTitle: entry.canvaDesignTitle ?? item.canvaDesignTitle ?? null,
                designEditUrl: entry.canvaDesignEditUrl ?? item.canvaDesignEditUrl ?? null,
                pages: cleanCanvaPages,
                coverPhoto: cleanCoverPhoto,
                coverPageIndex: cleanCoverPageIndex,
                insertedPhotos: cleanInsertedPhotos,
                tripStartDate: entry.tripStartDate ?? item.tripStartDate ?? null,
                tripEndDate: entry.tripEndDate ?? item.tripEndDate ?? null,
                instagramEmbeds: cleanInstagramEmbeds,
              })
            : entry.content,
          mood: entry.mood as JournalEntry['mood'],
          tags: entry.tags,
          photos: cleanInsertedPhotos.map((photo) => ({
            id: photo.id,
            url: photo.src,
            alt: photo.alt,
            uploadedAt: item.updatedAt,
          })),
          canvaDesignId: entry.canvaDesignId ?? item.canvaDesignId ?? null,
          canvaDesignTitle: entry.canvaDesignTitle ?? item.canvaDesignTitle ?? null,
          canvaDesignEditUrl: entry.canvaDesignEditUrl ?? item.canvaDesignEditUrl ?? null,
          canvaPages: cleanCanvaPages,
          canvaPageCount: cleanCanvaPages.length || null,
          coverPhoto: cleanCoverPhoto,
          coverPageIndex: cleanCoverPageIndex,
          insertedPhotos: cleanInsertedPhotos,
          instagramEmbeds: cleanInstagramEmbeds,
          tripStartDate: entry.tripStartDate ?? item.tripStartDate,
          tripEndDate: entry.tripEndDate ?? item.tripEndDate,
          updatedAt: new Date().toISOString(),
        };
      }
    );
    writeDemoJournalEntries(updatedEntries);
    const updatedEntry = updatedEntries.find((item) => item.id === entry.entryId);
    return updatedEntry
      ? { success: true, data: updatedEntry }
      : { success: false, error: 'Journal entry not found.' };
  }

  const response = await fetch('/api/journal', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });

  return response.json() as Promise<{ success: boolean; data?: JournalEntry; error?: string }>;
}

// Deletes an owned journal entry and lets the route clean up shares/comments.
export async function deleteJournalEntry(entryId: string) {
  if (isDemoMode()) {
    writeDemoJournalEntries(readDemoJournalEntries().filter((entry) => entry.id !== entryId));
    const shares = readDemoJournalShares();
    const nextShares = { ...shares };
    delete nextShares[entryId];
    writeDemoJournalShares(nextShares);
    return { success: true };
  }

  const response = await fetch('/api/journal', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entryId }),
  });

  return response.json() as Promise<{ success: boolean; error?: string }>;
}

// Loads the accepted friends currently receiving access to an owned entry.
export async function fetchJournalEntryShares(entryId: string) {
  if (isDemoMode()) {
    const entry = readDemoJournalEntries().find((item) => item.id === entryId);
    const shares = readDemoJournalShares();
    const friendIds = shares[entryId] ?? createDefaultDemoJournalShares(entry ? [entry] : [])[entryId] ?? [];

    return {
      success: true,
      data: entry && friendIds.includes(DEMO_SHARE_RECIPIENT_ID)
        ? [createDemoShareRecipient(entry.updatedAt || entry.createdAt)]
        : [],
    };
  }

  const response = await fetch(`/api/journal/share?entryId=${encodeURIComponent(entryId)}`);
  return parseJournalApiResponse<{ data?: JournalShareRecipient[] }>(response, 'Unable to load share settings.');
}

// Replaces the share recipient list for an owned entry.
export async function saveJournalEntryShares(entryId: string, friendIds: string[]) {
  if (isDemoMode()) {
    const entry = readDemoJournalEntries().find((item) => item.id === entryId);
    const selectedFriendIds = friendIds.includes(DEMO_SHARE_RECIPIENT_ID) ? [DEMO_SHARE_RECIPIENT_ID] : [];

    writeDemoJournalShares({
      ...readDemoJournalShares(),
      [entryId]: selectedFriendIds,
    });

    return {
      success: true,
      data: entry && selectedFriendIds.length > 0 ? [createDemoShareRecipient(new Date().toISOString())] : [],
    };
  }

  const response = await fetch('/api/journal/share', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      entryId,
      friendIds,
    }),
  });

  return parseJournalApiResponse<{ data?: JournalShareRecipient[] }>(response, 'Unable to save sharing settings.');
}

// Copies one owned entry into the local demo "Shared With Me" library. This is
// intentionally browser-local so demo mode never reads the owner's cloud data.
export async function publishJournalEntryToDemoShared(entry: JournalEntry, comments: JournalComment[] = []) {
  if (!isDemoMode()) {
    const publishResponse = await fetch('/api/demo/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entryId: entry.id }),
    });
    const publishResult = (await publishResponse.json().catch(() => null)) as { success?: boolean; error?: string } | null;

    if (!publishResponse.ok || !publishResult?.success) {
      return {
        success: false,
        error: publishResult?.error || 'This account cannot publish entries to the demo.',
      };
    }
  }

  const now = new Date().toISOString();
  const demoSharedEntry: JournalEntry = {
    ...entry,
    id: `demo-shared-copy-${entry.id}`,
    userId: DEMO_SHARE_RECIPIENT_ID,
    canvaDesignEditUrl: null,
    canva_design_edit_url: null,
    updatedAt: now,
  };
  const entries = await readDemoSharedJournalEntriesLarge();
  const existingIndex = entries.findIndex((item) => item.id === demoSharedEntry.id);
  const nextEntries =
    existingIndex >= 0
      ? entries.map((item, index) => (index === existingIndex ? demoSharedEntry : item))
      : [demoSharedEntry, ...entries];
  const demoComments = comments.map<JournalComment>((comment, index) => ({
    ...comment,
    id: `demo-copied-comment-${entry.id}-${index}`,
    journalEntryId: demoSharedEntry.id,
    authorId: comment.authorId || `demo-comment-author-${index}`,
    author: {
      id: comment.author.id || `demo-comment-author-${index}`,
      email: `demo-commenter-${index + 1}@traveljournal.app`,
      displayName: comment.author.displayName || 'Travel friend',
      avatar: comment.author.avatar,
    },
  }));

  try {
    await writeDemoSharedJournalEntriesLarge(nextEntries);
    const currentComments = readDemoJournalComments();
    writeDemoJournalComments({
      ...currentComments,
      [demoSharedEntry.id]: demoComments,
    });
    return { success: true, data: demoSharedEntry };
  } catch {
    return {
      success: false,
      error: 'This entry is too large for the local demo. Try copying a smaller text-focused entry.',
    };
  }
}

// Loads entries shared with the current user, using the same list/search shape
// as owned journal entries.
export async function fetchSharedJournalEntries(options?: {
  limit?: number;
  offset?: number;
  summary?: boolean;
  search?: string;
  searchScope?: 'all' | 'title' | 'country' | 'tag' | 'text';
}) {
  if (isDemoMode()) {
    const sharedEntries = (await readDemoSharedJournalEntriesLarge())
      .map<SharedJournalEntry>((entry) => ({
        ...entry,
        sharedBy: {
          id: DEMO_SHARE_RECIPIENT_ID,
          email: DEMO_SHARE_RECIPIENT_EMAIL,
          displayName: DEMO_SHARE_RECIPIENT_NAME,
        },
        sharedAt: entry.updatedAt || entry.createdAt,
        permission: 'view',
      }));
    const search = options?.search?.trim().toLowerCase();
    const filteredEntries = search
      ? sharedEntries.filter((entry) =>
          [
            entry.title,
            entry.countryId,
            entry.content,
            entry.sharedBy.displayName ?? '',
            entry.sharedBy.email,
            ...(entry.tags ?? []),
          ].some((value) => value.toLowerCase().includes(search))
        )
      : sharedEntries;
    const offset = options?.offset ?? 0;
    const pagedEntries =
      typeof options?.limit === 'number' ? filteredEntries.slice(offset, offset + options.limit) : filteredEntries;

    return {
      success: true,
      data: pagedEntries,
      count: filteredEntries.length,
      hasMore: typeof options?.limit === 'number' ? offset + pagedEntries.length < filteredEntries.length : false,
    };
  }

  const params = new URLSearchParams();

  if (typeof options?.limit === 'number') {
    params.set('limit', String(options.limit));
  }

  if (typeof options?.offset === 'number') {
    params.set('offset', String(options.offset));
  }

  if (options?.summary) {
    params.set('summary', 'true');
  }

  if (options?.search?.trim()) {
    params.set('search', options.search.trim());
    params.set('searchScope', options.searchScope ?? 'all');
  }

  const query = params.toString();
  const response = await fetch(`/api/journal/shared${query ? `?${query}` : ''}`);

  return response.json() as Promise<{
    success: boolean;
    data?: SharedJournalEntry[];
    count?: number;
    hasMore?: boolean;
    error?: string;
  }>;
}

// Fetches one shared journal entry the current user can access.
export async function fetchSharedJournalEntry(entryId: string) {
  if (isDemoMode()) {
    const entry = (await readDemoSharedJournalEntriesLarge()).find((item) => item.id === entryId);

    if (!entry) {
      return { success: false, error: 'Shared entry not found.' };
    }

    return {
      success: true,
      data: {
        ...entry,
        sharedBy: {
          id: DEMO_SHARE_RECIPIENT_ID,
          email: DEMO_SHARE_RECIPIENT_EMAIL,
          displayName: DEMO_SHARE_RECIPIENT_NAME,
        },
        sharedAt: entry.updatedAt || entry.createdAt,
        permission: 'view' as const,
      },
    };
  }

  const response = await fetch(`/api/journal/shared?entryId=${encodeURIComponent(entryId)}`);

  return response.json() as Promise<{
    success: boolean;
    data?: SharedJournalEntry;
    error?: string;
  }>;
}

// Loads the comment thread for an accessible entry.
export async function fetchJournalComments(entryId: string) {
  if (isDemoMode()) {
    return { success: true, data: readDemoJournalComments()[entryId] ?? [] };
  }

  const response = await fetch(`/api/journal/comments?entryId=${encodeURIComponent(entryId)}`);
  return response.json() as Promise<{ success: boolean; data?: JournalComment[]; error?: string }>;
}

// Adds a comment to an accessible entry.
export async function createJournalComment(entryId: string, body: string) {
  if (isDemoMode()) {
    const now = new Date().toISOString();
    const comment: JournalComment = {
      id: `demo-comment-${entryId}-${Date.now()}`,
      journalEntryId: entryId,
      authorId: DEMO_USER_ID,
      body,
      createdAt: now,
      author: {
        id: DEMO_USER_ID,
        email: 'demo@traveljournal.app',
        displayName: 'Demo Traveler',
      },
    };
    const comments = readDemoJournalComments();
    writeDemoJournalComments({
      ...comments,
      [entryId]: [...(comments[entryId] ?? []), comment],
    });

    return {
      success: true,
      data: comment,
    };
  }

  const response = await fetch('/api/journal/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entryId, body }),
  });

  return response.json() as Promise<{ success: boolean; data?: JournalComment; error?: string }>;
}
