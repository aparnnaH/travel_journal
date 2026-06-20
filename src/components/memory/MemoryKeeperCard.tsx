'use client';

import { type FormEvent, useMemo, useState } from 'react';
import { BookOpen, Camera, Clipboard, Feather, MessageCircleQuestion, Plus, Sparkles, Wand2, type LucideIcon } from 'lucide-react';
import { askMemoryKeeper } from '@/lib/ai/memoryKeeperClient';
import { Button } from '@/components/ui';
import {
  buildMemoryKeeperFacts,
  buildMemoryKeeperPromptSeed,
  buildMemoryKeeperPrompts,
  getMemoryKeeperDisplayDateLabel,
  getMemoryKeeperDisplayTripName,
  getMemoryKeeperFaqResponse,
  inferMemoryKeeperAction,
  memoryKeeperQuickActions,
  type MemoryKeeperPrompt,
  type MemoryKeeperQuickAction,
  type MemoryKeeperTripContext,
} from '@/services/memoryKeeperService';

type MemoryKeeperCardProps = {
  context: MemoryKeeperTripContext;
  draftText?: string;
  onUseDraft?: (value: string) => void;
  onAppendDraft?: (value: string) => void;
};

const helpQuestionPattern = /\b(how|where|can i|what do|help|add|save|import)\b/i;

const actionIcons: Record<MemoryKeeperQuickAction, LucideIcon> = {
  'fix-grammar': Feather,
  'make-more-descriptive': Wand2,
  'write-from-photos': Camera,
  'create-caption': Sparkles,
  'turn-into-journal-entry': BookOpen,
  'summarize-trip': Sparkles,
};

export default function MemoryKeeperCard({ context, draftText = '', onUseDraft, onAppendDraft }: MemoryKeeperCardProps) {
  const prompts = useMemo(() => buildMemoryKeeperPrompts(context), [context]);
  const facts = useMemo(() => buildMemoryKeeperFacts(context), [context]);
  const displayTripName = useMemo(() => getMemoryKeeperDisplayTripName(context), [context]);
  const displayDateLabel = useMemo(() => getMemoryKeeperDisplayDateLabel(context) || context.dateLabel, [context]);
  const [question, setQuestion] = useState('');
  const [activeAction, setActiveAction] = useState<MemoryKeeperQuickAction | null>(null);
  const [result, setResult] = useState('');
  const [resultSource, setResultSource] = useState<'ai' | 'template' | 'faq' | null>(null);
  const [error, setError] = useState('');
  const [copyNotice, setCopyNotice] = useState('');

  const runAction = async (action: MemoryKeeperQuickAction, selectedText?: string) => {
    setActiveAction(action);
    setError('');
    setCopyNotice('');

    try {
      const response = await askMemoryKeeper({
        action,
        context,
        selectedText: action === 'summarize-trip' && !selectedText ? undefined : selectedText ?? draftText,
      });

      setResult(response.result);
      setResultSource(response.method);
    } catch {
      setError('Memory Keeper could not write that yet. Try another prompt.');
    } finally {
      setActiveAction(null);
    }
  };

  const handlePromptClick = (prompt: MemoryKeeperPrompt) => {
    void runAction(prompt.action, buildMemoryKeeperPromptSeed(prompt, context, draftText));
  };

  const handleQuestionSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanQuestion = question.trim();

    if (!cleanQuestion) {
      return;
    }

    const faqResponse = getMemoryKeeperFaqResponse(cleanQuestion);

    if (faqResponse) {
      setResult(faqResponse);
      setResultSource('faq');
      setError('');
      return;
    }

    if (helpQuestionPattern.test(cleanQuestion)) {
      setResult('I can help with travel memories here. For app how-to questions, use the matching page controls: Passport for stamps, the photo tray for photos, and Import Trip for itineraries.');
      setResultSource('faq');
      setError('');
      return;
    }

    void runAction(inferMemoryKeeperAction(cleanQuestion), cleanQuestion);
    setQuestion('');
  };

  const handleCopyResult = async () => {
    if (!result.trim()) {
      return;
    }

    try {
      await navigator.clipboard.writeText(result);
      setCopyNotice('Copied');
    } catch {
      setCopyNotice('Select the text to copy it.');
    }
  };

  return (
    <section className="overflow-hidden rounded-lg border border-gold/20 bg-[#fffaf0] shadow-soft">
      <div className="border-b border-gold/15 bg-white/78 px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold/25 bg-cream text-gold-deep">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gold-deep">Memory Keeper</p>
            <h3 className="mt-1 font-serif text-xl text-ink">{displayTripName || 'Trip memories'}</h3>
            {displayDateLabel ? <p className="mt-1 text-xs font-semibold text-ink/48">{displayDateLabel}</p> : null}
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-2">
          {facts.map((fact) => (
            <div key={fact.id} className="rounded-lg border border-gold/15 bg-white px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/42">{fact.label}</p>
              <p className="mt-1 truncate text-sm font-semibold text-ink">{fact.value}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          {prompts.map((prompt) => (
            <button
              key={prompt.id}
              type="button"
              className="w-full rounded-lg border border-gold/18 bg-white px-3 py-3 text-left transition hover:border-gold/40 hover:bg-cream/45 focus:outline-none focus:ring-2 focus:ring-gold/25"
              onClick={() => handlePromptClick(prompt)}
            >
              <span className="block text-sm font-semibold text-ink">{prompt.title}</span>
              <span className="mt-1 block text-sm leading-5 text-ink/64">{prompt.body}</span>
            </button>
          ))}
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gold-deep">Quick actions</p>
          <div className="grid grid-cols-2 gap-2">
            {memoryKeeperQuickActions.map((action) => {
              const Icon = actionIcons[action.id];

              return (
                <Button
                  key={action.id}
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="min-h-10 justify-start gap-2 px-2 text-left text-xs"
                  isLoading={activeAction === action.id}
                  onClick={() => void runAction(action.id)}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="leading-tight">{action.label}</span>
                </Button>
              );
            })}
          </div>
        </div>

        <form className="space-y-2" onSubmit={handleQuestionSubmit}>
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gold-deep" htmlFor="memory-keeper-question">
            <MessageCircleQuestion className="h-4 w-4" aria-hidden="true" />
            Ask Memory Keeper
          </label>
          <div className="flex gap-2">
            <input
              id="memory-keeper-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Try: make this note warmer"
              className="min-w-0 flex-1 rounded-lg border border-gold/25 bg-white px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-gold focus:ring-2 focus:ring-gold/25"
            />
            <Button type="submit" size="sm" disabled={!question.trim() || Boolean(activeAction)}>
              Ask
            </Button>
          </div>
        </form>

        {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        {result ? (
          <div className="rounded-lg border border-gold/18 bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gold-deep">
                {resultSource === 'faq' ? 'Guide note' : 'Memory draft'}
              </p>
              {resultSource ? (
                <span className="rounded-full bg-cream px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink/48">
                  {resultSource === 'ai' ? 'AI' : resultSource === 'faq' ? 'FAQ' : 'Template'}
                </span>
              ) : null}
            </div>
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-ink/72">{result}</p>
            {copyNotice ? <p className="mt-2 text-xs font-semibold text-gold-deep">{copyNotice}</p> : null}
            {resultSource !== 'faq' ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {onUseDraft ? (
                  <Button type="button" size="sm" onClick={() => onUseDraft(result)}>
                    Use as Story
                  </Button>
                ) : null}
                {onAppendDraft ? (
                  <Button type="button" size="sm" variant="secondary" className="gap-2" onClick={() => onAppendDraft(result)}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add
                  </Button>
                ) : null}
                <Button type="button" size="sm" variant="ghost" className="gap-2" onClick={() => void handleCopyResult()}>
                  <Clipboard className="h-4 w-4" aria-hidden="true" />
                  Copy
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
