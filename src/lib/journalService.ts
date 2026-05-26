import type { JournalEntry, ExternalMedia } from '@/types';

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

/**
 * Import external media (Instagram, etc.) to a journal entry
 */
export async function importExternalMediaToEntry(
  userId: string,
  journalEntryId: string,
  media: ExternalMedia[]
) {
  const response = await fetch('/api/instagram/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      journalEntryId,
      media,
    }),
  });

  return response.json() as Promise<{ success: boolean; data?: JournalEntry; error?: string }>;
}
