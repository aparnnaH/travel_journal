// Trip import modal.
// Lets users paste text or choose files, then previews parsed itinerary data
// before handing it back to the journal workspace.
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui';
import { createTripImportDraft, isSupportedTripImportFile } from '@/services/import/tripImportService';
import type { TripImportResult } from '@/types/trips';
import AITripSummary from './AITripSummary';
import ParsedTimelineView from './ParsedTimelineView';
import TripPreviewCard from './TripPreviewCard';

type ImportTripModalProps = {
  open: boolean;
  inline?: boolean;
  startPageNumber: number;
  boardWidth: number;
  onClose: () => void;
  onImport: (result: TripImportResult) => void;
};

// Converts byte counts into compact UI labels.
const formatFileSize = (size: number) => {
  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(size / 1024))} KB`;
};

// Renders the import workflow and returns a parsed trip draft to the caller.
export default function ImportTripModal({
  open,
  inline = false,
  startPageNumber,
  boardWidth,
  onClose,
  onImport,
}: ImportTripModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [itineraryText, setItineraryText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [result, setResult] = useState<TripImportResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parsing is enabled when the user has either pasted text or selected files.
  const canParse = useMemo(
    () => Boolean(itineraryText.trim() || selectedFiles.length),
    [itineraryText, selectedFiles.length]
  );

  useEffect(() => {
    // Escape closes the modal to match common dialog behavior.
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, open]);

  const clearDraftResult = () => {
    setResult(null);
    setError(null);
  };

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const incomingFiles = Array.from(event.target.files || []).filter(isSupportedTripImportFile);

    if (!incomingFiles.length) {
      event.target.value = '';
      return;
    }

    setSelectedFiles((current) => {
      const existing = new Set(current.map((file) => `${file.name}:${file.size}`));
      const freshFiles = incomingFiles.filter((file) => !existing.has(`${file.name}:${file.size}`));
      return [...current, ...freshFiles].slice(0, 8);
    });
    clearDraftResult();
    event.target.value = '';
  };

  const removeFile = (fileToRemove: File) => {
    setSelectedFiles((current) =>
      current.filter((file) => `${file.name}:${file.size}` !== `${fileToRemove.name}:${fileToRemove.size}`)
    );
    clearDraftResult();
  };

  const handleParse = async () => {
    if (!canParse || isParsing) {
      return;
    }

    setIsParsing(true);
    setError(null);

    try {
      const draft = await createTripImportDraft({
        itineraryText,
        files: selectedFiles,
        startPageNumber,
        boardWidth,
      });
      setResult(draft);
    } catch {
      setError('Trip import could not be parsed.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = () => {
    if (!result) {
      return;
    }

    onImport(result);
    setItineraryText('');
    setSelectedFiles([]);
    setResult(null);
    setError(null);
    onClose();
  };

  const importPanel = open ? (
        <motion.div
          className={
            inline
              ? 'w-full'
              : 'fixed inset-0 z-50 flex items-center justify-center bg-ink/45 px-4 py-6 backdrop-blur-sm'
          }
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (inline) {
              return;
            }

            if (event.target === event.currentTarget) {
              onClose();
            }
          }}
        >
          <motion.div
            role={inline ? undefined : 'dialog'}
            aria-modal={inline ? undefined : 'true'}
            aria-labelledby="import-trip-title"
            className={
              inline
                ? 'w-full overflow-hidden rounded-lg border border-gold/25 bg-[#f8f0df] shadow-soft'
                : 'max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-lg border border-gold/35 bg-[#f8f0df] shadow-lg-soft'
            }
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 220, damping: 24 }}
          >
            <div className="border-b border-gold/20 bg-cream/80 px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gold-deep">Scrapbook Import</p>
                  <h2 id="import-trip-title" className="mt-1 text-3xl font-serif text-ink">
                    Import Trip
                  </h2>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>

            <div className={inline ? 'p-5' : 'max-h-[calc(92vh-84px)] overflow-y-auto p-5'}>
              <div className="grid gap-5 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
                <div className="space-y-4">
                  <section className="rounded-lg border border-gold/25 bg-white p-4 shadow-soft">
                    <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="itinerary-text">
                      Paste Itinerary Text
                    </label>
                    <textarea
                      id="itinerary-text"
                      value={itineraryText}
                      onChange={(event) => {
                        setItineraryText(event.target.value);
                        clearDraftResult();
                      }}
                      rows={11}
                      placeholder={'Day 1 - Paris\n9:00 AM Louvre Museum\nDinner in Le Marais'}
                      className="w-full resize-none rounded-lg border-2 border-gold/25 bg-cream/40 px-4 py-3 text-ink outline-none placeholder:text-ink/40 focus:border-gold focus:ring-2 focus:ring-gold/25"
                    />
                  </section>

                  <section className="rounded-lg border border-gold/25 bg-white p-4 shadow-soft">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-ink">Screenshots / PDFs</p>
                        <p className="text-xs text-ink/55">{selectedFiles.length} attached</p>
                      </div>
                      <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                        Upload
                      </Button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,application/pdf,.pdf"
                      multiple
                      className="sr-only"
                      onChange={handleFileSelection}
                    />
                    {selectedFiles.length ? (
                      <div className="space-y-2">
                        {selectedFiles.map((file) => (
                          <div
                            key={`${file.name}:${file.size}`}
                            className="flex items-center justify-between gap-3 rounded border border-gold/15 bg-cream/50 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-ink">{file.name}</p>
                              <p className="text-xs text-ink/55">{formatFileSize(file.size)}</p>
                            </div>
                            <Button type="button" size="sm" variant="ghost" onClick={() => removeFile(file)}>
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded border border-dashed border-gold/30 bg-cream/45 px-4 py-6 text-sm text-ink/55">
                        No files attached.
                      </div>
                    )}
                  </section>

                  <div className="flex flex-wrap gap-3">
                    <Button type="button" onClick={handleParse} isLoading={isParsing} disabled={!canParse}>
                      Parse Trip
                    </Button>
                    <Button type="button" variant="secondary" onClick={handleImport} disabled={!result}>
                      Create Journal Entry
                    </Button>
                  </div>
                  {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
                </div>

                <div className="space-y-4">
                  <AITripSummary trip={result?.trip || null} isLoading={isParsing} />
                  <TripPreviewCard result={result} />
                  <ParsedTimelineView timeline={result?.trip.timeline || []} />
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
  ) : null;

  if (inline) {
    return importPanel;
  }

  return <AnimatePresence>{importPanel}</AnimatePresence>;
}
