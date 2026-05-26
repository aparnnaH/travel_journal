import { useState, useCallback } from 'react';
import type { InstagramMedia, JournalEntry } from '@/types';

interface UseInstagramImportOptions {
  userId: string;
  journalEntryId: string;
}

export function useInstagramImport({ userId, journalEntryId }: UseInstagramImportOptions) {
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const importMedia = useCallback(
    async (selectedMedia: InstagramMedia[]) => {
      try {
        setImporting(true);
        setError(null);

        const response = await fetch('/api/instagram/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            journalEntryId,
            media: selectedMedia,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to import media');
        }

        const data = (await response.json()) as { success: boolean; data: JournalEntry };
        return data.data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to import media';
        setError(message);
        throw err;
      } finally {
        setImporting(false);
      }
    },
    [userId, journalEntryId]
  );

  return {
    importing,
    error,
    importMedia,
  };
}
