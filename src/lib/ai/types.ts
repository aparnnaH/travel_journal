import type { JournalEntry } from '@/types';
import type { ScrapbookPageData } from '@/lib/canvas/scrapbook';
import type { CountryStamp } from '@/types/stamps';

export type CompanionChatRole = 'assistant' | 'user';

export type TravelCompanionIntent =
  | 'general'
  | 'country-stats'
  | 'next-destination'
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

export type CompanionJournalEntry = {
  id: string;
  title: string;
  content: string;
  countryId: string;
  mood: JournalEntry['mood'] | string;
  tags: string[];
  createdAt: string;
};

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

export type TravelMemory = {
  id: string;
  source: TravelMemorySource;
  title: string;
  detail: string;
  createdAt?: string;
  countryHint?: string;
};

export type CompanionPassportStamp = {
  stampId: string;
  countryName: string;
  region: string;
  rarity: CountryStamp['rarity'];
  collected: boolean;
};

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
