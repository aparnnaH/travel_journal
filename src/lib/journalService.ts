// Client-side journal API wrapper.
// Keeping fetch calls here gives page components a stable, typed boundary for
// journal entries, sharing, shared entries, and comments.
import type { JournalEntry } from '@/types';
import type { JournalComment } from '@/types/journalComments';
import type { JournalShareRecipient, SharedJournalEntry } from '@/types/journalSharing';
import {
  DEMO_USER_ID,
  isDemoMode,
  readDemoJournalEntries,
  writeDemoJournalEntries,
} from '@/lib/demoMode';

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
    const newEntry: JournalEntry = {
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `demo-entry-${Date.now()}`,
      userId: DEMO_USER_ID,
      countryId: entry.countryId,
      title: entry.title,
      content: entry.content,
      mood: entry.mood as JournalEntry['mood'],
      tags: entry.tags,
      photos: [],
      canvaDesignId: entry.canvaDesignId ?? null,
      canvaDesignTitle: entry.canvaDesignTitle ?? null,
      canvaDesignEditUrl: entry.canvaDesignEditUrl ?? null,
      canvaPages: entry.canvaPages ?? [],
      coverPhoto: entry.coverPhoto ?? null,
      coverPageIndex: entry.coverPageIndex ?? null,
      insertedPhotos: entry.insertedPhotos ?? [],
      instagramEmbeds: entry.instagramEmbeds?.map((url, index) => ({ id: `demo-instagram-${index + 1}`, url })),
      tripStartDate: entry.tripStartDate ?? null,
      tripEndDate: entry.tripEndDate ?? null,
      createdAt: now,
      updatedAt: now,
    };

    writeDemoJournalEntries([newEntry, ...readDemoJournalEntries()]);
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
  tripStartDate?: string;
  tripEndDate?: string;
}) {
  if (isDemoMode()) {
    const entries = readDemoJournalEntries();
    const updatedEntries = entries.map((item) =>
      item.id === entry.entryId
        ? {
            ...item,
            countryId: entry.countryId,
            title: entry.title,
            content: entry.content,
            mood: entry.mood as JournalEntry['mood'],
            tags: entry.tags,
            tripStartDate: entry.tripStartDate ?? item.tripStartDate,
            tripEndDate: entry.tripEndDate ?? item.tripEndDate,
            updatedAt: new Date().toISOString(),
          }
        : item
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
    return { success: true, data: [] };
  }

  const response = await fetch(`/api/journal/share?entryId=${encodeURIComponent(entryId)}`);
  return response.json() as Promise<{ success: boolean; data?: JournalShareRecipient[]; error?: string }>;
}

// Replaces the share recipient list for an owned entry.
export async function saveJournalEntryShares(entryId: string, friendIds: string[]) {
  if (isDemoMode()) {
    return { success: true, data: [] };
  }

  const response = await fetch('/api/journal/share', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      entryId,
      friendIds,
    }),
  });

  return response.json() as Promise<{ success: boolean; data?: JournalShareRecipient[]; error?: string }>;
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
    return { success: true, data: [], count: 0, hasMore: false };
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
    return { success: false, error: 'Shared entries are not available in demo mode.' };
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
    return { success: true, data: [] };
  }

  const response = await fetch(`/api/journal/comments?entryId=${encodeURIComponent(entryId)}`);
  return response.json() as Promise<{ success: boolean; data?: JournalComment[]; error?: string }>;
}

// Adds a comment to an accessible entry.
export async function createJournalComment(entryId: string, body: string) {
  if (isDemoMode()) {
    return {
      success: false,
      error: 'Comments are preview-only in demo mode.',
    };
  }

  const response = await fetch('/api/journal/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entryId, body }),
  });

  return response.json() as Promise<{ success: boolean; data?: JournalComment; error?: string }>;
}
