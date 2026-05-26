'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { InstagramMedia } from '@/types';

interface InstagramMediaCardProps {
  media: InstagramMedia;
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
  className?: string;
}

/**
 * Instagram Media Card Component
 * Displays individual Instagram media with selection capability
 */
export function InstagramMediaCard({
  media,
  isSelected = false,
  onSelect,
  className = '',
}: InstagramMediaCardProps) {
  const handleClick = () => {
    onSelect?.(!isSelected);
  };

  const mediaTypeIcons = {
    IMAGE: '🖼️',
    VIDEO: '🎥',
    CAROUSEL_ALBUM: '📚',
  };

  const typeIcon = mediaTypeIcons[media.mediaType];
  const date = new Date(media.timestamp).toLocaleDateString();

  return (
    <motion.div
      onClick={handleClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`
        relative cursor-pointer rounded-lg overflow-hidden
        border-2 transition-all duration-200
        ${isSelected ? 'border-purple-500 shadow-lg shadow-purple-500/50' : 'border-gray-200 hover:border-purple-300'}
        ${className}
      `}
    >
      {/* Media Image */}
      <div className="relative w-full aspect-square bg-gray-100">
        {media.mediaUrl || media.thumbnailUrl ? (
          <img
            src={media.mediaUrl || media.thumbnailUrl || ''}
            alt={media.caption || 'Instagram media'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100">
            <span className="text-4xl">{typeIcon}</span>
          </div>
        )}

        {/* Media Type Badge */}
        <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
          <span>{typeIcon}</span>
          <span>{media.mediaType.replace('_', ' ')}</span>
        </div>

        {/* Overlay on hover/selection */}
        <motion.div
          initial={false}
          animate={isSelected ? { opacity: 1 } : { opacity: 0 }}
          className="absolute inset-0 bg-purple-500/40"
        />

        {/* Selection Checkbox */}
        <motion.div
          initial={false}
          animate={isSelected ? { scale: 1 } : { scale: 0.5 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <motion.div
            className={`
              w-8 h-8 rounded-full border-2 flex items-center justify-center
              ${isSelected ? 'bg-purple-500 border-purple-500' : 'bg-white border-white'}
            `}
          >
            {isSelected && (
              <motion.svg
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </motion.svg>
            )}
          </motion.div>
        </motion.div>
      </div>

      {/* Caption and Date */}
      <div className="p-3 bg-white">
        {media.caption && (
          <p className="text-sm text-gray-700 line-clamp-2 mb-1">{media.caption}</p>
        )}
        <p className="text-xs text-gray-500">{date}</p>
      </div>
    </motion.div>
  );
}
