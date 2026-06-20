// Trip import preview card.
// Displays the parsed trip summary before it is imported into the journal.
'use client';

import { motion } from 'framer-motion';
import type { TripImportResult } from '@/types/trips';

type TripPreviewCardProps = {
  result: TripImportResult | null;
};

// Renders parsed trip details for review.
export default function TripPreviewCard({ result }: TripPreviewCardProps) {
  if (!result) {
    return (
      <div className="rounded-lg border border-dashed border-gold/35 bg-[#fff8ea] p-5 text-sm text-ink/60">
        Trip preview will appear after parsing.
      </div>
    );
  }

  const { trip, journalDraft, scrapbookPages } = result;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-gold/25 bg-[#fff8ea] p-5 shadow-soft"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-deep">Journal Draft</p>
          <h3 className="mt-1 text-2xl font-semibold text-ink">{journalDraft.title}</h3>
          <p className="mt-2 text-sm leading-6 text-ink/70">{trip.summary}</p>
        </div>
        <div className="rounded-lg border border-gold/20 bg-white px-3 py-2 text-center shadow-soft">
          <p className="text-2xl font-semibold text-ink">{scrapbookPages.length}</p>
          <p className="text-xs uppercase tracking-wide text-ink/50">Pages</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded border border-gold/15 bg-white/70 p-3">
          <p className="text-xs uppercase tracking-wide text-ink/50">Country</p>
          <p className="mt-1 font-semibold text-ink">{journalDraft.countryId}</p>
        </div>
        <div className="rounded border border-gold/15 bg-white/70 p-3">
          <p className="text-xs uppercase tracking-wide text-ink/50">Dates</p>
          <p className="mt-1 font-semibold text-ink">{trip.dateRange?.label || 'Flexible'}</p>
        </div>
        <div className="rounded border border-gold/15 bg-white/70 p-3">
          <p className="text-xs uppercase tracking-wide text-ink/50">Stamps</p>
          <p className="mt-1 font-semibold text-ink">
            {trip.passportStampIds.length ? trip.passportStampIds.join(', ') : 'Pending'}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {journalDraft.tags.map((tag) => (
          <span key={tag} className="rounded-full border border-gold/20 bg-white px-3 py-1 text-xs text-ink/65">
            {tag}
          </span>
        ))}
      </div>
    </motion.section>
  );
}
