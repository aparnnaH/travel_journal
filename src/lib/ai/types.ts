// Shared AI companion type contracts.
// These types describe the normalized memory archive passed between client
// components, companion services, and AI API routes.
import type { JournalEntry } from '@/types';
import type { ScrapbookPageData } from '@/lib/canvas/scrapbook';
import type { CountryStamp } from '@/types/stamps';

export type CompanionChatRole = 'assistant' | 'user';

// Intent labels let the companion route messages to deterministic handlers or
// more open-ended AI responses without relying only on raw text.
export type TravelCompanionIntent =
  | 'general'
  | 'country-stats'
  | 'next-destination'
  | 'journal-entry'
  | 'journal-suggestions'
  | 'memory-reflections'
  | 'trip-recap'
  | 'scrapbook-captions'
  | 'travel-personality'
  | 'memory-organization'
  | 'passport-stamps';

export type CompanionChatMessage = {
  id: string;
  role: CompanionChatRole;
  content: string;
  createdAt: string;
  intent: TravelCompanionIntent;
};

// Journal entries are normalized into this compact shape before they become AI
// context, which protects the service from database naming differences.
export type CompanionJournalEntry = {
  id: string;
  title: string;
  content: string;
  countryId: string;
  countryName: string;
  mood: JournalEntry['mood'] | string;
  tags: string[];
  createdAt: string;
};

// Imported trips are summarized for AI context so the companion does not need
// entire itinerary blobs to answer memory questions.
export type ImportedTripSnapshot = {
  id: string;
  title: string;
  summary: string;
  importedAt: string;
  primaryCountryId?: string;
  primaryCountryName?: string;
  passportStampIds: string[];
  tags: string[];
  mood: JournalEntry['mood'] | string;
  dayCount: number;
  locationNames: string[];
};

export type TravelMemorySource = 'journal' | 'scrapbook-note' | 'scrapbook-photo' | 'trip-import';

// Unified memory records let the companion reason over journal text, scrapbook
// notes/photos, and imported trips with one collection.
export type TravelMemory = {
  id: string;
  source: TravelMemorySource;
  title: string;
  detail: string;
  createdAt?: string;
  countryHint?: string;
};

// Passport stamp summaries support collection-aware prompts without sending the
// full visual stamp catalog through every companion flow.
export type CompanionPassportStamp = {
  stampId: string;
  countryName: string;
  region: string;
  rarity: CountryStamp['rarity'];
  collected: boolean;
};

// Derived profile and summary types power the companion dashboard cards.
export type TravelPersonalityProfile = {
  label: string;
  description: string;
  reasons: string[];
};

export type CompanionTripSummary = {
  headline: string;
  coverage: string;
  highlights: string[];
  nextFocus: string;
};

export type TravelReflection = {
  id: string;
  title: string;
  reflection: string;
  anchor: string;
};

export type MemoryInsight = {
  id: string;
  title: string;
  detail: string;
  cta?: string;
};

export type CompanionTravelContext = {
  journalEntries: CompanionJournalEntry[];
  scrapbookPages: ScrapbookPageData[];
  importedTrips: ImportedTripSnapshot[];
  visitedCountryIds: string[];
  visitedCountryNames: string[];
  passportStamps: CompanionPassportStamp[];
  memoryPool: TravelMemory[];
  topTags: string[];
  topMoods: string[];
  personality: TravelPersonalityProfile;
  tripSummary: CompanionTripSummary;
};

// Suggested prompts and insights are deterministic outputs built from archive
// context before any chat request happens.
export type SuggestedPrompt = {
  id: string;
  title: string;
  prompt: string;
  intent: TravelCompanionIntent;
};

export type CompanionInsightBundle = {
  prompts: SuggestedPrompt[];
  journalSuggestions: string[];
  captionIdeas: string[];
  reflections: TravelReflection[];
  insightCards: MemoryInsight[];
};

export type CompanionArchiveSnapshot = {
  counts: {
    journalEntries: number;
    scrapbookPages: number;
    importedTrips: number;
    visitedCountries: number;
    passportStamps: number;
  };
  visitedCountryNames: string[];
  topTags: string[];
  topMoods: string[];
  personality: TravelPersonalityProfile;
  tripSummary: CompanionTripSummary;
  recentJournalEntries: Array<{
    title: string;
    country: string;
    mood: string;
    tags: string[];
    excerpt: string;
  }>;
  recentMemories: Array<{
    title: string;
    source: TravelMemorySource;
    detail: string;
    countryHint?: string;
  }>;
  importedTripSummaries: Array<{
    title: string;
    summary: string;
    locations: string[];
    tags: string[];
  }>;
  passportStamps: Array<{
    countryName: string;
    region: string;
    rarity: CountryStamp['rarity'];
  }>;
};
