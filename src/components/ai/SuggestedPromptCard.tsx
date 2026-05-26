'use client';

import React from 'react';
import { motion } from 'framer-motion';

type SuggestedPromptCardProps = {
  title: string;
  prompt: string;
  onSelect: (prompt: string) => void;
};

export default function SuggestedPromptCard({ title, prompt, onSelect }: SuggestedPromptCardProps) {
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(prompt)}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      className="w-full rounded-lg border border-gold/22 bg-white px-4 py-3 text-left shadow-soft transition hover:border-gold/45"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-deep">{title}</p>
      <p className="mt-2 text-sm leading-6 text-ink/85">{prompt}</p>
    </motion.button>
  );
}

