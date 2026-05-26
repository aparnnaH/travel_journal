'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { InstagramMediaCard } from './InstagramMediaCard';
import { useInstagramMedia } from '@/hooks/instagram';
import type { InstagramMedia } from '@/types';

interface InstagramMediaGridProps {
  userId: string;
  selectedMediaIds?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>, selectedMedia: InstagramMedia[]) => void;
  limit?: number;
  className?: string;
}

/**
 * Instagram Media Grid Component
 * Displays a grid of Instagram media with infinite scroll and multi-select
 */
export function InstagramMediaGrid({
  userId,
  selectedMediaIds,
  onSelectionChange,
  limit = 20,
  className = '',
}: InstagramMediaGridProps) {
  const { media, loading, error, hasMore, fetchMedia, loadMore } = useInstagramMedia({
    userId,
    limit,
  });

  const [internalSelectedIds, setInternalSelectedIds] = useState<Set<string>>(() => new Set());
  const activeSelectedIds = selectedMediaIds ?? internalSelectedIds;

  useEffect(() => {
    fetchMedia();
  }, [userId, fetchMedia]);

  const handleSelectMedia = (mediaId: string, selected: boolean) => {
    const newSelected = new Set(activeSelectedIds);
    if (selected) {
      newSelected.add(mediaId);
    } else {
      newSelected.delete(mediaId);
    }

    if (!selectedMediaIds) {
      setInternalSelectedIds(newSelected);
    }

    onSelectionChange?.(
      newSelected,
      media.filter((item) => newSelected.has(item.id))
    );
  };

  const handleLoadMore = () => {
    loadMore();
  };

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-red-500 font-semibold mb-2">Failed to load Instagram media</div>
        <p className="text-gray-600 text-sm mb-4">{error}</p>
        <button
          onClick={() => fetchMedia()}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (loading && media.length === 0) {
    return (
      <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 ${className}`}>
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="aspect-square bg-gray-200 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (media.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-5xl mb-4">📷</div>
        <p className="text-gray-600 font-semibold mb-2">No Instagram media found</p>
        <p className="text-gray-500 text-sm">Try connecting to a different Instagram account</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-6"
      >
        {media.map((item) => (
          <InstagramMediaCard
            key={item.id}
            media={item}
            isSelected={activeSelectedIds.has(item.id)}
            onSelect={(selected) => handleSelectMedia(item.id, selected)}
          />
        ))}
      </motion.div>

      {hasMore && (
        <div className="flex justify-center">
          <motion.button
            onClick={handleLoadMore}
            disabled={loading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-3 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 disabled:opacity-50 transition-all"
          >
            {loading ? 'Loading...' : 'Load More'}
          </motion.button>
        </div>
      )}

      {activeSelectedIds.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-4 right-4 bg-purple-500 text-white px-4 py-2 rounded-full font-semibold shadow-lg"
        >
          {activeSelectedIds.size} selected
        </motion.div>
      )}
    </div>
  );
}
