// Travel reflection card.
// Displays a compact reflection prompt derived from companion context.
'use client';

import React from 'react';
import { motion } from 'framer-motion';

type TravelReflectionCardProps = {
  title: string;
  reflection: string;
  anchor: string;
};

// Renders one reflection item in the companion UI.
export default function TravelReflectionCard({ title, reflection, anchor }: TravelReflectionCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-gold/20 bg-[#fffef8] px-4 py-4 shadow-soft"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-deep">Reflection</p>
      <h3 className="mt-1 text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-ink/80">{reflection}</p>
      <p className="mt-3 text-sm italic text-ink/62">{anchor}</p>
    </motion.article>
  );
}
