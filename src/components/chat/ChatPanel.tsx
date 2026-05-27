'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui';
import type { CompanionChatMessage } from '@/lib/ai/types';
import { formatTimestamp } from '@/services/ai/travelCompanionService';

type ChatPanelProps = {
  messages: CompanionChatMessage[];
  isThinking: boolean;
  canSaveJournalDraft?: boolean;
  isSavingJournalDraft?: boolean;
  onSendMessage: (message: string) => void;
  onSaveJournalDraft?: () => void | Promise<void>;
};

export default function ChatPanel({
  messages,
  isThinking,
  canSaveJournalDraft = false,
  isSavingJournalDraft = false,
  onSendMessage,
  onSaveJournalDraft,
}: ChatPanelProps) {
  const [draft, setDraft] = useState('');
  const feedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const feedNode = feedRef.current;
    if (!feedNode) {
      return;
    }

    feedNode.scrollTo({
      top: feedNode.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, isThinking]);

  const groupedMessages = useMemo(
    () =>
      messages.map((message) => ({
        ...message,
        timestampLabel: formatTimestamp(message.createdAt),
      })),
    [messages]
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanDraft = draft.trim();

    if (!cleanDraft || isThinking) {
      return;
    }

    onSendMessage(cleanDraft);
    setDraft('');
  };

  return (
    <section className="relative overflow-hidden rounded-lg border border-gold/30 bg-[#fff9ec] shadow-lg-soft">
      <div className="border-b border-gold/20 bg-cream/70 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-deep">AI Travel Companion</p>
        <h2 className="mt-1 text-2xl font-serif text-ink">Memory Conversation</h2>
      </div>

      <div ref={feedRef} className="h-[58vh] min-h-[420px] overflow-y-auto px-4 py-4 md:px-5">
        <AnimatePresence initial={false}>
          {groupedMessages.map((message) => (
            <motion.article
              key={message.id}
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
              className={[
                'mb-3 max-w-[88%] rounded-lg border px-4 py-3 shadow-soft',
                message.role === 'assistant'
                  ? 'mr-auto border-gold/20 bg-white text-ink'
                  : 'ml-auto border-[#2f6f6d]/25 bg-[#e8f6f3] text-ink',
              ].join(' ')}
            >
              <p className="whitespace-pre-line text-sm leading-6">{message.content}</p>
              {message.timestampLabel ? (
                <p className="mt-2 text-[0.67rem] uppercase tracking-[0.2em] text-ink/45">{message.timestampLabel}</p>
              ) : null}
            </motion.article>
          ))}
        </AnimatePresence>

        {isThinking ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-3 inline-flex items-center gap-2 rounded-lg border border-gold/20 bg-white px-4 py-3 text-sm text-ink/65 shadow-soft"
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-gold-deep" />
            Thinking through your travel archive...
          </motion.div>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-gold/20 bg-cream/60 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              void onSaveJournalDraft?.();
            }}
            disabled={!canSaveJournalDraft || isSavingJournalDraft || isThinking}
          >
            {isSavingJournalDraft ? 'Saving...' : 'Save Draft to Journal'}
          </Button>
          {canSaveJournalDraft ? (
            <p className="text-xs text-ink/62">Saves the current AI journal draft as a real journal entry.</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <label htmlFor="companion-message" className="sr-only">
            Message your travel companion
          </label>
          <textarea
            id="companion-message"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={2}
            placeholder="Ask for a recap, journal prompts, caption ideas, or stamp strategy..."
            className="w-full resize-none rounded-lg border-2 border-gold/25 bg-white px-4 py-3 text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/25"
          />
          <Button type="submit" disabled={!draft.trim() || isThinking} className="md:shrink-0">
            Send
          </Button>
        </div>
      </form>
    </section>
  );
}
