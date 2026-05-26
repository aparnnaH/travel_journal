import { useState, useCallback } from 'react';
import type { InstagramMedia } from '@/types';

interface UseInstagramMediaOptions {
  userId: string;
  limit?: number;
}

export function useInstagramMedia({ userId, limit = 20 }: UseInstagramMediaOptions) {
  const [media, setMedia] = useState<InstagramMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | undefined>();

  const fetchMedia = useCallback(
    async (after?: string) => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          userId,
          limit: limit.toString(),
        });

        if (after) {
          params.append('after', after);
        }

        const response = await fetch(`/api/instagram/media?${params.toString()}`);

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch Instagram media');
        }

        const data = await response.json();

        if (after) {
          // Append to existing media
          setMedia((prev) => [...prev, ...data.data]);
        } else {
          // Replace media
          setMedia(data.data);
        }

        setCursor(data.nextCursor);
        setHasMore(!!data.nextCursor);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [userId, limit]
  );

  const loadMore = useCallback(() => {
    if (cursor && !loading) {
      fetchMedia(cursor);
    }
  }, [cursor, loading, fetchMedia]);

  return {
    media,
    loading,
    error,
    hasMore,
    fetchMedia,
    loadMore,
  };
}
