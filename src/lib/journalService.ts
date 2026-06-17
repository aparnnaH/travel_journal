import type { JournalEntry } from '@/types';
import type { JournalComment } from '@/types/journalComments';
import type { JournalShareRecipient, SharedJournalEntry } from '@/types/journalSharing';

export async function fetchJournalEntries(userId: string) {
  const response = await fetch(`/api/journal?userId=${encodeURIComponent(userId)}`);
  return response.json() as Promise<{ success: boolean; data?: JournalEntry[]; error?: string }>;
}

export async function createJournalEntry(entry: {
  userId: string;
  countryId: string;
  title: string;
  content: string;
  mood: string;
  tags: string[];
}) {
  const response = await fetch('/api/journal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });

  return response.json() as Promise<{ success: boolean; data?: JournalEntry; error?: string }>;
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

export async function fetchSharedJournalEntries() {
  const response = await fetch('/api/journal/shared');
  return response.json() as Promise<{ success: boolean; data?: SharedJournalEntry[]; error?: string }>;
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
