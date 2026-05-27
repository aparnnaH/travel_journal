'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import AppHeader from '@/components/layout/AppHeader';
import ChatPanel from '@/components/chat/ChatPanel';
import SuggestedPromptCard from '@/components/ai/SuggestedPromptCard';
import MemoryInsightCard from '@/components/ai/MemoryInsightCard';
import TravelReflectionCard from '@/components/ai/TravelReflectionCard';
import AITripSummaryCard from '@/components/ai/AITripSummaryCard';
import { useTravelCompanionChat } from '@/hooks/chat/useTravelCompanionChat';
import { useAuthStore } from '@/store/authStore';
import { useMapStore } from '@/store/mapStore';
import { fetchJournalEntries } from '@/lib/journalService';
import { readImportedTripsFromStorage, readScrapbookPagesFromStorage } from '@/lib/ai/storage';
import type { ImportedTripSnapshot } from '@/lib/ai/types';
import type { JournalEntry } from '@/types';
import {
  buildCompanionInsights,
  buildTravelCompanionContext,
} from '@/services/ai/travelCompanionService';

type RawJournalEntry = Partial<JournalEntry> & {
  country_id?: string;
  created_at?: string;
};

type TopologyGeometry = {
  type?: string;
  id?: string | number;
  properties?: {
    name?: unknown;
  } | null;
  geometries?: TopologyGeometry[];
};

type TopologyRoot = {
  objects?: Record<string, { geometries?: TopologyGeometry[] }>;
};

type CompanionDataState = {
  journalEntries: RawJournalEntry[];
  importedTrips: ImportedTripSnapshot[];
  scrapbookPagesLoaded: ReturnType<typeof readScrapbookPagesFromStorage>;
};

type CompanionRailView = 'prompts' | 'insights' | 'memories' | 'passport';

const initialDataState: CompanionDataState = {
  journalEntries: [],
  importedTrips: [],
  scrapbookPagesLoaded: [],
};

const worldAtlasGeoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const collectTopologyCountryNames = (geometry: TopologyGeometry, map: Record<string, string>) => {
  if (geometry.type === 'GeometryCollection' && Array.isArray(geometry.geometries)) {
    geometry.geometries.forEach((child) => collectTopologyCountryNames(child, map));
    return;
  }

  if (geometry.id === undefined || geometry.id === null) {
    return;
  }

  const name = geometry.properties?.name;

  if (typeof name !== 'string' || !name.trim()) {
    return;
  }

  map[String(geometry.id).toUpperCase()] = name;
};

export default function TravelCompanionPage() {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const visitedCountryIds = useMapStore((state) => state.visitedCountries);
  const countryLabels = useMapStore((state) => state.countryLabels);
  const router = useRouter();

  const [dataState, setDataState] = useState<CompanionDataState>(initialDataState);
  const [loadingState, setLoadingState] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [atlasCountryLabels, setAtlasCountryLabels] = useState<Record<string, string>>({});
  const [railView, setRailView] = useState<CompanionRailView>('prompts');

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, router, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let isActive = true;

    const loadTravelData = async () => {
      setLoadingState(true);

      const [journalResponse] = await Promise.all([fetchJournalEntries(user.id)]);
      if (!isActive) {
        return;
      }

      const scrapbookPagesLoaded = readScrapbookPagesFromStorage(user.id);
      const importedTrips = readImportedTripsFromStorage(user.id);

      if (!journalResponse.success) {
        setLoadError(journalResponse.error || 'Journal entries could not be loaded.');
      } else {
        setLoadError(null);
      }

      setDataState({
        journalEntries: journalResponse.success && Array.isArray(journalResponse.data) ? journalResponse.data : [],
        importedTrips,
        scrapbookPagesLoaded,
      });
      setLoadingState(false);
    };

    void loadTravelData();

    return () => {
      isActive = false;
    };
  }, [user]);

  useEffect(() => {
    let isActive = true;

    const loadAtlasCountryLabels = async () => {
      try {
        const response = await fetch(worldAtlasGeoUrl);
        if (!response.ok) {
          return;
        }

        const topology = (await response.json()) as TopologyRoot;
        const objects = topology.objects ? Object.values(topology.objects) : [];
        const nextLabels: Record<string, string> = {};

        objects.forEach((collection) => {
          collection.geometries?.forEach((geometry) => collectTopologyCountryNames(geometry, nextLabels));
        });

        if (isActive) {
          setAtlasCountryLabels(nextLabels);
        }
      } catch {
        if (isActive) {
          setAtlasCountryLabels({});
        }
      }
    };

    void loadAtlasCountryLabels();

    return () => {
      isActive = false;
    };
  }, []);

  const resolvedCountryLabels = useMemo(
    () => ({ ...atlasCountryLabels, ...countryLabels }),
    [atlasCountryLabels, countryLabels]
  );

  const context = useMemo(() => {
    if (!user) {
      return null;
    }

    return buildTravelCompanionContext({
      journalEntries: dataState.journalEntries,
      importedTrips: dataState.importedTrips,
      scrapbookPages: dataState.scrapbookPagesLoaded,
      visitedCountryIds,
      countryLabels: resolvedCountryLabels,
    });
  }, [dataState, resolvedCountryLabels, user, visitedCountryIds]);

  const insights = useMemo(() => (context ? buildCompanionInsights(context) : null), [context]);
  const recentMemories = useMemo(() => context?.memoryPool.slice(0, 5) ?? [], [context]);
  const passportSnapshot = useMemo(() => context?.passportStamps.slice(0, 6) ?? [], [context]);

  const { messages, isThinking, isSavingJournalDraft, canSaveJournalDraft, sendMessage, sendPrompt, saveJournalDraft } =
    useTravelCompanionChat({
      context,
      userId: user?.id,
    });

  if (isLoading || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader />
      <main className="relative overflow-hidden pb-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(139,96,53,0.18),transparent_28rem),radial-gradient(circle_at_85%_8%,rgba(47,111,109,0.2),transparent_30rem),repeating-linear-gradient(0deg,rgba(61,43,14,0.028)_0_1px,transparent_1px_8px)]" />

        <div className="relative mx-auto w-full max-w-[1380px] px-4 pt-8 sm:px-6 lg:px-8">
          <motion.header
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 overflow-hidden rounded-lg border border-gold/28 bg-[#f7eedc] px-5 py-5 shadow-lg-soft"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold-deep">AI Companion</p>
            <h1 className="mt-2 text-4xl font-serif text-ink sm:text-5xl">Travel Memory Companion</h1>
            <p className="mt-2 max-w-4xl text-base leading-7 text-ink/78">
              A dedicated scrapbook intelligence space that learns from your journal entries, imported trips, passport stamps, and page layouts.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink/66">
              <span className="rounded-md border border-gold/25 bg-white/72 px-2.5 py-1.5">{context?.journalEntries.length ?? 0} journal entries</span>
              <span className="rounded-md border border-gold/25 bg-white/72 px-2.5 py-1.5">{context?.scrapbookPages.length ?? 0} scrapbook pages</span>
              <span className="rounded-md border border-gold/25 bg-white/72 px-2.5 py-1.5">{context?.importedTrips.length ?? 0} imported trips</span>
              <span className="rounded-md border border-gold/25 bg-white/72 px-2.5 py-1.5">{context?.passportStamps.length ?? 0} stamp links</span>
            </div>
          </motion.header>

          {loadingState ? (
            <div className="rounded-lg border border-gold/20 bg-white/84 px-5 py-4 text-sm text-ink/72 shadow-soft">
              Syncing travel archive...
            </div>
          ) : null}

          {loadError ? (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</div>
          ) : null}

          <div className="mt-6 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-5">
              <ChatPanel
                messages={messages}
                isThinking={isThinking}
                canSaveJournalDraft={canSaveJournalDraft}
                isSavingJournalDraft={isSavingJournalDraft}
                onSendMessage={sendMessage}
                onSaveJournalDraft={saveJournalDraft}
              />

              {insights ? (
                <section className="rounded-lg border border-gold/20 bg-[#fffaf0] px-4 py-4 shadow-soft">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-2xl font-serif text-ink">Journal + Caption Studio</h2>
                    <p className="text-xs uppercase tracking-[0.2em] text-ink/52">AI suggestions</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <article className="rounded-lg border border-gold/20 bg-white px-4 py-3">
                      <h3 className="text-lg font-semibold text-ink">Journal Suggestions</h3>
                      <div className="mt-2 space-y-2">
                        {insights.journalSuggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => sendPrompt(suggestion)}
                            className="block w-full rounded-md border border-gold/16 bg-cream/45 px-3 py-2 text-left text-sm leading-6 text-ink/78 transition hover:border-gold/35"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </article>

                    <article className="rounded-lg border border-gold/20 bg-white px-4 py-3">
                      <h3 className="text-lg font-semibold text-ink">Scrapbook Caption Ideas</h3>
                      <div className="mt-2 space-y-2">
                        {insights.captionIdeas.map((caption) => (
                          <button
                            key={caption}
                            type="button"
                            onClick={() => sendPrompt(`Use this caption direction: ${caption}`)}
                            className="block w-full rounded-md border border-gold/16 bg-cream/45 px-3 py-2 text-left text-sm leading-6 text-ink/78 transition hover:border-gold/35"
                          >
                            {caption}
                          </button>
                        ))}
                      </div>
                    </article>
                  </div>
                </section>
              ) : null}
            </div>

            <aside className="space-y-4 xl:sticky xl:top-6">
              {context ? <AITripSummaryCard summary={context.tripSummary} /> : null}

              <section className="rounded-lg border border-gold/24 bg-[#f9f2e2] px-3 py-3 shadow-soft">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['prompts', 'Prompts'],
                    ['insights', 'Insights'],
                    ['memories', 'Memories'],
                    ['passport', 'Passport'],
                  ].map(([key, label]) => {
                    const isActive = railView === key;

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setRailView(key as CompanionRailView)}
                        className={[
                          'rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition',
                          isActive
                            ? 'border-gold/60 bg-white text-ink shadow-soft'
                            : 'border-gold/25 bg-cream/55 text-ink/70 hover:border-gold/45',
                        ].join(' ')}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </section>

              <motion.div
                key={railView}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="max-h-[62vh] space-y-2.5 overflow-y-auto pr-1 xl:max-h-[calc(100vh-18rem)]"
              >
                {railView === 'prompts' && insights ? (
                  <section className="space-y-2.5">
                    {insights.prompts.map((prompt) => (
                      <SuggestedPromptCard key={prompt.id} title={prompt.title} prompt={prompt.prompt} onSelect={sendPrompt} />
                    ))}
                  </section>
                ) : null}

                {railView === 'insights' && insights ? (
                  <section className="space-y-2.5">
                    {insights.reflections.map((reflection) => (
                      <TravelReflectionCard
                        key={reflection.id}
                        title={reflection.title}
                        reflection={reflection.reflection}
                        anchor={reflection.anchor}
                      />
                    ))}
                    {insights.insightCards.map((card) => (
                      <MemoryInsightCard key={card.id} title={card.title} detail={card.detail} cta={card.cta} />
                    ))}
                  </section>
                ) : null}

                {railView === 'memories' ? (
                  <section className="rounded-lg border border-gold/20 bg-white px-4 py-4 shadow-soft">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-serif text-ink">Recent Memories</h2>
                        <p className="text-sm text-ink/62">From journal, scrapbook, and imported trip context.</p>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      {recentMemories.length ? (
                        recentMemories.map((memory) => (
                          <article key={memory.id} className="rounded-md border border-gold/14 bg-cream/42 px-3 py-2">
                            <p className="text-sm font-semibold text-ink">{memory.title}</p>
                            <p className="mt-1 text-sm text-ink/72">{memory.detail}</p>
                          </article>
                        ))
                      ) : (
                        <p className="text-sm text-ink/60">No travel memories found yet.</p>
                      )}
                    </div>
                  </section>
                ) : null}

                {railView === 'passport' ? (
                  <section className="rounded-lg border border-gold/20 bg-white px-4 py-4 shadow-soft">
                    <h2 className="text-xl font-serif text-ink">Passport Quick Access</h2>
                    <div className="mt-3 space-y-2">
                      {passportSnapshot.length ? (
                        passportSnapshot.map((stamp) => (
                          <p key={`${stamp.stampId}-${stamp.countryName}`} className="rounded-md border border-gold/14 bg-cream/42 px-3 py-2 text-sm text-ink/76">
                            {stamp.countryName} · {stamp.region} · {stamp.rarity}
                          </p>
                        ))
                      ) : (
                        <p className="text-sm text-ink/60">No collected stamps detected yet.</p>
                      )}
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-center text-sm">
                      <Link href="/passport" className="rounded-md border border-gold/30 bg-cream/60 px-3 py-2 text-ink transition hover:bg-cream">
                        Open Passport
                      </Link>
                      <Link href="/journal" className="rounded-md border border-gold/30 bg-cream/60 px-3 py-2 text-ink transition hover:bg-cream">
                        Open Journal
                      </Link>
                    </div>
                  </section>
                ) : null}
              </motion.div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
