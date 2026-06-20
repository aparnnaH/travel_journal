// AI companion trip summary card.
// Presents the computed high-level summary of the user's archive.
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { CompanionTripSummary } from '@/lib/ai/types';

type AITripSummaryCardProps = {
  summary: CompanionTripSummary;
};

// Renders the companion trip summary.
export default function AITripSummaryCard({ summary }: AITripSummaryCardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-gold/30 bg-[#f8f0de] px-4 py-4 shadow-md-soft"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-deep">Trip Recap Engine</p>
      <h3 className="mt-2 text-xl font-serif text-ink">{summary.headline}</h3>
      <p className="mt-2 text-sm leading-6 text-ink/80">{summary.coverage}</p>

      <div className="mt-3 space-y-2">
        {summary.highlights.map((item) => (
          <p key={item} className="rounded-md border border-gold/18 bg-white/75 px-3 py-2 text-sm text-ink/80">
            {item}
          </p>
        ))}
      </div>

      <p className="mt-3 text-sm text-ink/76">{summary.nextFocus}</p>
    </motion.section>
  );
}
