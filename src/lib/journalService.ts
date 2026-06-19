import type { JournalEntry } from '@/types';
import type { JournalComment } from '@/types/journalComments';
import type { JournalShareRecipient, SharedJournalEntry } from '@/types/journalSharing';

export async function fetchJournalEntries(options?: {
  limit?: number;
  offset?: number;
  summary?: boolean;
  search?: string;
  searchScope?: 'all' | 'title' | 'country' | 'tag' | 'text';
}) {
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

export async function fetchJournalEntry(entryId: string) {
  const response = await fetch(`/api/journal?entryId=${encodeURIComponent(entryId)}`);

  return response.json() as Promise<{
    success: boolean;
    data?: JournalEntry;
    error?: string;
  }>;
}

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
}) {
  const response = await fetch('/api/journal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });

  return response.json() as Promise<{ success: boolean; data?: JournalEntry; error?: string }>;
}

export async function updateJournalEntryTitle(entry: {
  entryId: string;
  title: string;
}) {
  const response = await fetch('/api/journal', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });

  return response.json() as Promise<{ success: boolean; data?: JournalEntry; error?: string }>;
}

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
  const response = await fetch('/api/journal', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });

  return response.json() as Promise<{ success: boolean; data?: JournalEntry; error?: string }>;
}

export async function deleteJournalEntry(entryId: string) {
  const response = await fetch('/api/journal', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entryId }),
  });

  return response.json() as Promise<{ success: boolean; error?: string }>;
}

export async function fetchJournalEntryShares(entryId: string) {
  const response = await fetch(`/api/journal/share?entryId=${encodeURIComponent(entryId)}`);
  return response.json() as Promise<{ success: boolean; data?: JournalShareRecipient[]; error?: string }>;
}

export async function saveJournalEntryShares(entryId: string, friendIds: string[]) {
  const response = await fetch('/api/journal/share', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      entryId,
      friendIds,
      permission: 'view',
    }),
  });

  return response.json() as Promise<{ success: boolean; data?: JournalShareRecipient[]; error?: string }>;
}

export async function fetchSharedJournalEntries(options?: {
  limit?: number;
  offset?: number;
  summary?: boolean;
  search?: string;
  searchScope?: 'all' | 'title' | 'country' | 'tag' | 'text';
}) {
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

export async function fetchSharedJournalEntry(entryId: string) {
  const response = await fetch(`/api/journal/shared?entryId=${encodeURIComponent(entryId)}`);

  return response.json() as Promise<{
    success: boolean;
    data?: SharedJournalEntry;
    error?: string;
  }>;
}

export async function fetchJournalComments(entryId: string) {
  const response = await fetch(`/api/journal/comments?entryId=${encodeURIComponent(entryId)}`);
  return response.json() as Promise<{ success: boolean; data?: JournalComment[]; error?: string }>;
}

export async function createJournalComment(entryId: string, body: string) {
  const response = await fetch('/api/journal/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entryId, body }),
  });

  return response.json() as Promise<{ success: boolean; data?: JournalComment; error?: string }>;
}
