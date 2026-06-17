'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookPlus, Loader2, Send, Sparkles, X } from 'lucide-react';
import type { CompanionChatMessage } from '@/lib/ai/types';
import { formatTimestamp } from '@/services/ai/travelCompanionService';

type ChatPanelProps = {
  messages: CompanionChatMessage[];
  isThinking: boolean;
  canSaveJournalDraft?: boolean;
  isSavingJournalDraft?: boolean;
  onSendMessage: (message: string) => void;
  onClearChat?: () => void;
  onSaveJournalDraft?: () => void | Promise<void>;
};

export default function ChatPanel({
  messages,
  isThinking,
  canSaveJournalDraft = false,
  isSavingJournalDraft = false,
  onSendMessage,
  onClearChat,
  onSaveJournalDraft,
}: ChatPanelProps) {
  const [draft, setDraft] = useState('');
  const [isFocused, setIsFocused] = useState(false);
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
    <section className="relative flex h-[640px] min-h-[560px] overflow-hidden rounded-xl border border-gold/28 bg-[#fff9ec] shadow-lg-soft">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_8%,rgba(184,134,69,0.2),transparent_18rem),radial-gradient(circle_at_88%_12%,rgba(47,111,109,0.14),transparent_20rem)]" />
      <div className="relative flex min-h-0 w-full flex-col">
        <div className="flex items-center justify-between border-b border-gold/24 bg-cream/80 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-gold-deep" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-deep">AI Travel Companion</p>
              <h2 className="text-base font-semibold text-ink">Memory Conversation</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClearChat}
            disabled={!onClearChat}
            className="rounded-full p-2 text-ink/55 transition-colors hover:bg-gold/12 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Clear companion chat"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div ref={feedRef} className="min-h-0 flex-1 overflow-y-auto bg-[#fffaf0]/84 px-4 py-4 md:px-5">
          {groupedMessages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Sparkles className="mb-4 h-12 w-12 text-gold-deep" aria-hidden="true" />
              <h3 className="text-xl font-serif text-ink">How can I help with your travels?</h3>
              <p className="mt-2 max-w-xs text-sm leading-6 text-ink/62">
                Ask for a recap, journal prompt, caption idea, or passport strategy.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence initial={false}>
                {groupedMessages.map((message) => (
                  <motion.article
                    key={message.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.24, ease: 'easeOut' }}
                    className={['flex', message.role === 'assistant' ? 'justify-start' : 'justify-end'].join(' ')}
                  >
                    <div
                      className={[
                        'max-w-[84%] rounded-2xl px-4 py-3 shadow-xl',
                        message.role === 'assistant'
                          ? 'rounded-tl-none border border-gold/20 bg-white text-ink'
                          : 'rounded-tr-none bg-[#2f6f6d] text-white',
                      ].join(' ')}
                    >
                      <p className="whitespace-pre-line text-sm leading-6">{message.content}</p>
                      {message.timestampLabel ? (
                        <p
                          className={[
                            'mt-2 text-[0.67rem] uppercase tracking-[0.18em]',
                            message.role === 'assistant' ? 'text-ink/45' : 'text-white/68',
                          ].join(' ')}
                        >
                          {message.timestampLabel}
                        </p>
                      ) : null}
                    </div>
                  </motion.article>
                ))}
              </AnimatePresence>

              {isThinking ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl rounded-tl-none border border-gold/20 bg-white p-3 text-ink shadow-soft">
                    <div className="flex items-center gap-2" aria-label="Companion is thinking">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-gold-deep" />
                      <span className="h-2 w-2 animate-pulse rounded-full bg-gold-deep [animation-delay:0.2s]" />
                      <span className="h-2 w-2 animate-pulse rounded-full bg-gold-deep [animation-delay:0.4s]" />
                      <span className="pl-1 text-xs text-ink/58">Reading your travel archive...</span>
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className={[
            'border-t p-4 transition-colors duration-200',
            isFocused ? 'border-gold/55 bg-cream/90' : 'border-gold/22 bg-cream/62',
          ].join(' ')}
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void onSaveJournalDraft?.();
              }}
              disabled={!canSaveJournalDraft || isSavingJournalDraft || isThinking}
              className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-white/72 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-gold-deep transition hover:border-gold/60 hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isSavingJournalDraft ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <BookPlus className="h-4 w-4" aria-hidden="true" />
              )}
              {isSavingJournalDraft ? 'Saving' : 'Save Draft'}
          </button>
          {canSaveJournalDraft ? (
            <p className="text-xs text-ink/58">Save the current AI journal draft as an entry.</p>
          ) : null}
        </div>
          <div className="relative flex items-end">
            <label htmlFor="companion-message" className="sr-only">
              Message your travel companion
            </label>
            <textarea
              id="companion-message"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              rows={2}
              placeholder="Ask for a recap, journal prompts, caption ideas, or stamp strategy..."
              className="max-h-28 min-h-12 w-full resize-none rounded-3xl border border-gold/26 bg-white py-3 pl-4 pr-14 text-sm text-ink outline-none transition placeholder:text-ink/45 focus:border-gold/70 focus:ring-2 focus:ring-gold/25"
            />
            <button
              type="submit"
              disabled={!draft.trim() || isThinking}
              className={[
              'absolute bottom-1.5 right-1.5 rounded-full p-2 transition-colors',
              !draft.trim() || isThinking
                ? 'cursor-not-allowed bg-cream text-ink/35'
                : 'bg-[#2f6f6d] text-white hover:bg-[#285f5d]',
            ].join(' ')}
              aria-label="Send message"
            >
              {isThinking ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
