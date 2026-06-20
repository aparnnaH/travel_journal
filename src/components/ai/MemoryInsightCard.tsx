// Memory insight card for the AI companion rail.
// Shows one derived insight about the user's travel archive.
'use client';

import React from 'react';
import { motion } from 'framer-motion';

type MemoryInsightCardProps = {
  title: string;
  detail: string;
  cta?: string;
};

// Renders a single companion insight.
export default function MemoryInsightCard({ title, detail, cta }: MemoryInsightCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-gold/22 bg-white px-4 py-4 shadow-soft"
    >
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-ink/78">{detail}</p>
      {cta ? <p className="mt-3 text-xs uppercase tracking-[0.18em] text-gold-deep">{cta}</p> : null}
    </motion.article>
  );
}
