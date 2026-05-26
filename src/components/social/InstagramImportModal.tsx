'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { InstagramAuthButton } from './InstagramAuthButton';
import { InstagramMediaGrid } from './InstagramMediaGrid';
import { Button } from '@/components/ui';
import { useInstagramImport } from '@/hooks/instagram';
import type { InstagramMedia } from '@/types';

interface InstagramImportModalProps {
  userId: string;
  journalEntryId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  isConnected?: boolean;
}

export default function InstagramImportModal({
  userId,
  journalEntryId,
  isOpen,
  onClose,
  onSuccess,
  isConnected: initialConnected = false,
}: InstagramImportModalProps) {
  const isConnected = initialConnected;
  const [selectedMediaIds, setSelectedMediaIds] = useState<Set<string>>(new Set());
  const [selectedMedia, setSelectedMedia] = useState<InstagramMedia[]>([]);
  const { importing, error, importMedia } = useInstagramImport({ userId, journalEntryId });

  const handleSelectionChange = (mediaIds: Set<string>, mediaItems: InstagramMedia[]) => {
    setSelectedMediaIds(mediaIds);
    setSelectedMedia(mediaItems);
  };

  const handleImport = async () => {
    await importMedia(selectedMedia);
    setSelectedMediaIds(new Set());
    setSelectedMedia([]);
    onSuccess?.();
    onClose();
  };

  const handleClose = () => {
    setSelectedMediaIds(new Set());
    setSelectedMedia([]);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 transform"
          >
            <div className="mx-4 rounded-2xl bg-cream shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gold/20 px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📷</span>
                  <h2 className="text-xl font-semibold text-ink">
                    {isConnected ? 'Select Instagram Media' : 'Connect Instagram'}
                  </h2>
                </div>
                <button
                  onClick={handleClose}
                  className="rounded-lg p-2 hover:bg-gold/10 transition-colors"
                  aria-label="Close modal"
                >
                  <span className="text-2xl">✕</span>
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {!isConnected ? (
                  // Phase 1: Connect Instagram
                  <motion.div
                    key="connect-phase"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6 text-center"
                  >
                    <div className="space-y-2">
                      <p className="text-lg text-ink font-medium">
                        Connect your Instagram account
                      </p>
                      <p className="text-sm text-ink/60">
                        Import your Instagram posts directly into your journal entries
                      </p>
                    </div>

                    <div className="flex justify-center">
                      <svg
                        className="w-24 h-24 text-gold/30"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z" />
                        <path d="M5.953 12a6.047 6.047 0 1112.094 0 6.047 6.047 0 01-12.094 0zm2.25 0a3.797 3.797 0 107.594 0 3.797 3.797 0 00-7.594 0zm7.171-6.27a1.414 1.414 0 110-2.828 1.414 1.414 0 010 2.828z" />
                      </svg>
                    </div>

                    <InstagramAuthButton
                      size="md"
                      variant="primary"
                      className="w-full"
                    />
                  </motion.div>
                ) : (
                  // Phase 2: Select Media
                  <motion.div
                    key="select-phase"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-ink/70">
                        {selectedMediaIds.size > 0
                          ? `${selectedMediaIds.size} item${selectedMediaIds.size === 1 ? '' : 's'} selected`
                          : 'Select media to import'}
                      </p>
                    </div>

                    <InstagramMediaGrid
                      userId={userId}
                      selectedMediaIds={selectedMediaIds}
                      onSelectionChange={handleSelectionChange}
                      limit={20}
                      className="max-h-96 overflow-y-auto"
                    />
                  </motion.div>
                )}
              </div>

              {/* Footer */}
              {isConnected && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3 border-t border-gold/20 px-6 py-4"
                >
                  <Button
                    variant="secondary"
                    onClick={handleClose}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleImport}
                    disabled={selectedMediaIds.size === 0 || importing}
                    isLoading={importing}
                    className="flex-1"
                  >
                    Import {selectedMediaIds.size > 0 ? `(${selectedMediaIds.size})` : ''} Media
                  </Button>
                </motion.div>
              )}

              {error && (
                <div className="px-6 pb-4 text-sm text-red-600">
                  {error}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
