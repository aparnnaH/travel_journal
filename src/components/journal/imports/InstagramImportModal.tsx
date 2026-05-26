'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { InstagramAuthButton } from '@/components/social/InstagramAuthButton';
import { InstagramMediaGrid } from '@/components/social/InstagramMediaGrid';
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

/**
 * Instagram Import Modal
 * Full flow for authenticating with Instagram and selecting media to import
 */
export function InstagramImportModal({
  userId,
  journalEntryId,
  isOpen,
  onClose,
  onSuccess,
  isConnected = false,
}: InstagramImportModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedMedia, setSelectedMedia] = useState<InstagramMedia[]>([]);
  const { importing, error, importMedia } = useInstagramImport({
    userId,
    journalEntryId,
  });

  const handleImport = async () => {
    try {
      await importMedia(selectedMedia);
      setSelectedIds(new Set());
      setSelectedMedia([]);
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Import failed:', err);
    }
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
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
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Modal */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl z-50 overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg
                  className="w-6 h-6 text-transparent bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z" />
                  <path d="M5.838 12a6.162 6.162 0 1 1 12.324 0 6.162 6.162 0 0 1-12.324 0zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm4.965-10.322a1.44 1.44 0 1 1 2.881.001 1.44 1.44 0 0 1-2.881-.001z" />
                </svg>
                <h2 className="text-xl font-bold text-gray-900">Import from Instagram</h2>
              </div>
              <motion.button
                onClick={onClose}
                whileHover={{ rotate: 90 }}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
            </div>

            {/* Content */}
            <div className="p-6">
              {!isConnected ? (
                // Not Connected State
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-12"
                >
                  <div className="text-6xl mb-4">📱</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Connect Your Instagram</h3>
                  <p className="text-gray-600 mb-6">
                    Authenticate with Instagram to browse and import your posts into this journal entry.
                  </p>
                  <InstagramAuthButton variant="primary" size="lg" />
                </motion.div>
              ) : (
                // Connected State - Show Media Grid
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Select Media to Import</h3>
                    <p className="text-gray-600 text-sm">
                      Choose one or more photos from your Instagram to add to this journal entry.
                      {selectedIds.size > 0 && (
                        <span className="ml-2 font-semibold text-purple-600">
                          {selectedIds.size} selected
                        </span>
                      )}
                    </p>
                  </div>

                  <InstagramMediaGrid
                    userId={userId}
                    selectedMediaIds={selectedIds}
                    onSelectionChange={(mediaIds, mediaItems) => {
                      setSelectedIds(mediaIds);
                      setSelectedMedia(mediaItems);
                    }}
                    className="max-h-[400px] overflow-y-auto mb-6"
                  />

                  {error && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm"
                    >
                      {error}
                    </motion.div>
                  )}
                </motion.div>
              )}
            </div>

            {/* Footer */}
            {isConnected && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3"
              >
                <motion.button
                  onClick={onClose}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </motion.button>
                <motion.button
                  onClick={handleImport}
                  disabled={selectedIds.size === 0 || importing}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {importing ? 'Importing...' : `Import ${selectedIds.size} Photo${selectedIds.size !== 1 ? 's' : ''}`}
                </motion.button>
              </motion.div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
