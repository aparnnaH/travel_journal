// Import-generated trip summary block.
// Provides a concise summary of parsed trip content inside the import modal.
'use client';

import { motion } from 'framer-motion';
import type { ParsedTripDraft } from '@/types/trips';

type AITripSummaryProps = {
  trip: ParsedTripDraft | null;
  isLoading?: boolean;
};

// Renders a summary of the parsed trip draft.
export default function AITripSummary({ trip, isLoading = false }: AITripSummaryProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-gold/20 bg-white/80 p-4 shadow-soft">
        <div className="h-4 w-32 rounded bg-cream" />
        <div className="mt-3 h-3 w-full rounded bg-cream" />
        <div className="mt-2 h-3 w-2/3 rounded bg-cream" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="rounded-lg border border-dashed border-gold/35 bg-cream/50 p-4 text-sm text-ink/60">
        Trip import summary will appear here.
      </div>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-gold/20 bg-white/85 p-4 shadow-soft"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-deep">Trip Import Summary</p>
          <h3 className="mt-1 text-xl font-semibold text-ink">{trip.title}</h3>
        </div>
        <div className="min-w-20 text-right">
          <p className="text-xs uppercase tracking-wide text-ink/50">Parsed detail</p>
          <p className="text-lg font-semibold text-ink">{trip.confidence}%</p>
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-cream">
        <div className="h-full rounded-full bg-gold-deep" style={{ width: `${trip.confidence}%` }} />
      </div>

      <p className="mt-3 text-sm leading-6 text-ink/75">{trip.summary}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {trip.sourceSignals.map((signal) => (
          <span
            key={signal.id}
            className="rounded-full border border-gold/20 bg-cream/70 px-3 py-1 text-xs text-ink/70"
          >
            {signal.label}
            {signal.detail ? `: ${signal.detail}` : ''}
          </span>
        ))}
      </div>
    </motion.section>
  );
}
