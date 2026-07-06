// Travel Companion domain service.
// This module turns journal entries, scrapbook pages, imports, and map visits
// into deterministic chat replies, prompts, insights, and journal drafts.
import { COUNTRY_STAMPS } from '@/data/stamps/countries';
import { ATLAS_STAMP_COUNTRIES } from '@/data/stamps/atlasCountries';
import { placeholderCountries } from '@/lib/placeholderData';
import { normalizeCountryToStampId } from '@/lib/stamps/assets';
import type {
  CompanionChatMessage,
  CompanionInsightBundle,
  CompanionJournalEntry,
  CompanionPassportStamp,
  CompanionTravelContext,
  CompanionTripSummary,
  ImportedTripSnapshot,
  MemoryInsight,
  SuggestedPrompt,
  TravelCompanionIntent,
  TravelMemory,
  TravelPersonalityProfile,
  TravelReflection,
} from '@/lib/ai/types';
import type { ScrapbookPageData } from '@/lib/canvas/scrapbook';
import type { JournalEntry } from '@/types';

type RawJournalEntry = Partial<JournalEntry> & {
  country_id?: string;
  created_at?: string;
};

type BuildCompanionContextInput = {
  journalEntries: RawJournalEntry[];
  scrapbookPages: ScrapbookPageData[];
  importedTrips: ImportedTripSnapshot[];
  visitedCountryIds: string[];
  countryLabels?: Record<string, string>;
};

export type JournalDraftSession = {
  countryName: string;
  places: string[];
  lastDraft: string;
  personalDetails?: {
    mood?: string;
    highlight?: string;
    sensory?: string;
    reflection?: string;
    futurePlan?: string;
  };
};

export type JournalEntryInteractionResult = {
  handled: boolean;
  response?: CompanionChatMessage;
  nextSession?: JournalDraftSession | null;
};

const stampById = new Map(COUNTRY_STAMPS.map((stamp) => [stamp.id, stamp]));
const countryById = new Map(placeholderCountries.map((country) => [country.id, country]));
const countryByCode = new Map(placeholderCountries.map((country) => [country.code, country]));
const atlasCountryById = new Map(ATLAS_STAMP_COUNTRIES.map((country) => [country.atlas_id, country]));
const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

let worldCountryCatalogCache: string[] | null = null;

// Keyword routing gives common questions deterministic answers before the UI
// reaches for more general chat behavior.
const intentKeywords: Record<TravelCompanionIntent, string[]> = {
  general: [],
  'country-stats': ['country count', 'countries visited', 'how many countries', 'visited countries', 'places visited'],
  'next-destination': ['where next', 'go next', 'visit next', 'next destination', 'travel next'],
  'journal-entry': ['journal entry', 'write entry', 'make entry', 'draft entry', 'jounral enrty'],
  'journal-suggestions': ['journal', 'prompt', 'write', 'entry', 'story', 'draft'],
  'memory-reflections': ['reflect', 'memory', 'remember', 'nostalgia', 'reflection'],
  'trip-recap': ['recap', 'summary', 'summarize', 'trip', 'itinerary'],
  'scrapbook-captions': ['caption', 'photo', 'scrapbook', 'polaroid'],
  'travel-personality': ['personality', 'style', 'traveler', 'traveller', 'pattern'],
  'memory-organization': ['organize', 'organise', 'sort', 'tag', 'folder', 'cleanup', 'clean up'],
  'passport-stamps': ['stamp', 'passport', 'seal', 'collection', 'region'],
};

// Client-safe id helper for generated chat messages and insight cards.
const createCompanionId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

// Shortens memory snippets so companion context stays readable in cards and
// chat responses.
const snippet = (text: string, maxLength = 160) => {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) {
    return '';
  }

  if (clean.length <= maxLength) {
    return clean;
  }

  return `${clean.slice(0, maxLength - 1).trim()}…`;
};

// Resolves a country id/code to a display label, preferring caller-provided map
// labels and falling back to seeded country data or Intl region names.
const getCountryName = (countryId: string, countryLabels?: Record<string, string>) => {
  const explicitLabel = countryLabels?.[countryId];

  if (explicitLabel) {
    return explicitLabel;
  }

  const knownCountry = countryById.get(countryId) || countryByCode.get(countryId);

  if (knownCountry) {
    return knownCountry.name;
  }

  const atlasCountry = atlasCountryById.get(countryId);

  if (atlasCountry) {
    return atlasCountry.name;
  }

  if (/^[A-Z]{2}$/i.test(countryId)) {
    try {
      const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
      const label = regionNames.of(countryId.toUpperCase());
      if (label && label !== countryId.toUpperCase() && label !== 'Unknown Region') {
        return label;
      }
    } catch {
      return countryId;
    }
  }

  return countryId;
};

// Normalizes database/client journal entry shapes into one companion-safe type.
const normalizeJournalEntry = (entry: RawJournalEntry, countryLabels?: Record<string, string>): CompanionJournalEntry => {
  const countryId = String(entry.countryId ?? entry.country_id ?? 'Unknown');

  return {
    id: String(entry.id ?? createCompanionId()),
    title: String(entry.title ?? 'Untitled memory'),
    content: String(entry.content ?? ''),
    countryId,
    countryName: getCountryName(countryId, countryLabels),
    mood: String(entry.mood ?? 'reflective'),
    tags: Array.isArray(entry.tags) ? entry.tags.map((tag) => String(tag).trim()).filter(Boolean) : [],
    createdAt: String(entry.createdAt ?? entry.created_at ?? new Date().toISOString()),
  };
};

const toTimestamp = (value?: string) => (value ? new Date(value).getTime() || 0 : 0);
const countryTokenPattern = '(?:countries?|countr(?:y|ies)|countires|coutires|places)';
const isNumericCountryCode = (value: string) => /^\d{3}$/.test(value.trim());
const normalizeCountryLabel = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const countryNameAliases: Record<string, string> = {
  'united states of america': 'united states',
  usa: 'united states',
  uk: 'united kingdom',
  'russian federation': 'russia',
  'czech republic': 'czechia',
  'korea republic of': 'south korea',
  'korea democratic people s republic of': 'north korea',
  'lao people s democratic republic': 'laos',
  'myanmar burma': 'myanmar',
  'eswatini swaziland': 'eswatini',
  'cape verde': 'cabo verde',
  'viet nam': 'vietnam',
};

// Canonical keys make country matching tolerant of spelling and naming variants.
const canonicalCountryKey = (value: string) => {
  const normalized = normalizeCountryLabel(value);
  return countryNameAliases[normalized] ?? normalized;
};

// Builds an in-memory list of world country names from Intl.DisplayNames. The
// cache avoids rebuilding the catalog for every next-destination question.
const buildWorldCountryCatalog = () => {
  if (worldCountryCatalogCache) {
    return worldCountryCatalogCache;
  }

  try {
    const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
    const countryNames = new Set<string>();

    alphabet.forEach((firstLetter) => {
      alphabet.forEach((secondLetter) => {
        const code = `${firstLetter}${secondLetter}`;
        const label = regionNames.of(code);

        if (!label || label === code || label === 'Unknown Region') {
          return;
        }

        countryNames.add(label);
      });
    });

    worldCountryCatalogCache = [...countryNames].sort((first, second) => first.localeCompare(second));
    return worldCountryCatalogCache;
  } catch {
    worldCountryCatalogCache = [];
    return worldCountryCatalogCache;
  }
};

const nearbyDestinationHints: Record<string, string[]> = {
  'United States': ['Canada', 'Mexico', 'Iceland', 'Portugal'],
  Canada: ['Iceland', 'Ireland', 'Norway', 'Japan'],
  Mexico: ['Colombia', 'Peru', 'Chile', 'Portugal'],
  France: ['Portugal', 'Croatia', 'Greece', 'Morocco'],
  Italy: ['Croatia', 'Greece', 'Turkey', 'Portugal'],
  Spain: ['Portugal', 'Morocco', 'Croatia', 'Greece'],
  Germany: ['Austria', 'Croatia', 'Greece', 'Norway'],
  Japan: ['South Korea', 'Vietnam', 'Thailand', 'Indonesia'],
  Australia: ['New Zealand', 'Indonesia', 'Vietnam', 'Thailand'],
  Brazil: ['Argentina', 'Chile', 'Peru', 'Colombia'],
};

const personalityDestinationHints: Record<string, string[]> = {
  'Story Archivist': ['Japan', 'Italy', 'Portugal', 'Croatia', 'Morocco'],
  'Cultural Curator': ['Greece', 'Turkey', 'Egypt', 'Morocco', 'Vietnam'],
  'Wanderflow Explorer': ['New Zealand', 'Chile', 'Peru', 'Iceland', 'Norway'],
  'Taste & Texture Traveler': ['Thailand', 'Vietnam', 'Turkey', 'Portugal', 'Mexico'],
  'Momentum Traveler': ['South Africa', 'Argentina', 'Indonesia', 'Chile', 'Turkey'],
  'Reflective Explorer': ['Iceland', 'New Zealand', 'Japan', 'Norway', 'Portugal'],
};

// Intent detectors catch common phrasing and typos that keyword matching alone
// would miss.
const hasCountryStatsQuestion = (message: string) => {
  const lowerMessage = message.toLowerCase();

  return (
    new RegExp(`\\b(?:how\\s+many|number\\s+of|count\\s+of)\\b[^?]*\\b${countryTokenPattern}\\b`).test(lowerMessage) ||
    new RegExp(`\\b(?:what|which)\\b[^?]*\\b${countryTokenPattern}\\b[^?]*\\b(?:visited|been\\s+to)\\b`).test(lowerMessage) ||
    new RegExp(`\\b${countryTokenPattern}\\b[^?]*\\b(?:i\\s+visited|ive\\s+visited|i\\'ve\\s+visited|visited)\\b`).test(lowerMessage)
  );
};

const hasNextDestinationQuestion = (message: string) => {
  const lowerMessage = message.toLowerCase();

  return (
    /\b(?:where|what|which)\b[^?]*\b(?:go|travel|visit)\b[^?]*\bnext\b/.test(lowerMessage) ||
    /\bnext\s+(?:trip|destination|country|place)\b/.test(lowerMessage) ||
    /\bbased on\b[^?]*\b(?:visited|countries|country|countires|coutires)\b[^?]*\b(?:where|what)\b/.test(lowerMessage)
  );
};

const hasJournalEntryRequest = (message: string) => {
  const lowerMessage = message.toLowerCase();
  const journalSignal = /\b(journal|jounral|jornal|joural)\b/.test(lowerMessage);
  const entrySignal = /\b(entry|enrty|draft|write|create|compose|make)\b/.test(lowerMessage);
  return journalSignal && entrySignal;
};

const getRefinementMode = (message: string): 'shorter' | 'poetic' | 'factual' | null => {
  const lowerMessage = message.toLowerCase();

  if (/\b(shorter|short|concise|brief)\b/.test(lowerMessage)) {
    return 'shorter';
  }

  if (/\b(poetic|poem|lyrical|more emotional)\b/.test(lowerMessage)) {
    return 'poetic';
  }

  if (/\b(factual|fact|direct|plain|straightforward)\b/.test(lowerMessage)) {
    return 'factual';
  }

  return null;
};

const hasDraftAugmentSignal = (message: string) => /^\s*(include|add|also include|also add)\b/i.test(message.trim());
const futurePlanSignalPattern =
  /\b(go back|return|come back|visit again|next time|following time|would love|want to|plan to|hope to|universal studios)\b/i;

const hasPersonalizationSignal = (message: string) => {
  const lowerMessage = message.toLowerCase();
  return (
    /\b(mood|felt|feeling|favorite|favourite|highlight|moment|detail|sound|smell|taste|lesson|reflection|realized|realised|surprised)\b/.test(
      lowerMessage
    ) ||
    /^\s*[1-4][\).:-]\s+/m.test(lowerMessage) ||
    /\b1[\).:-]\s*[\s\S]*\b2[\).:-]/.test(lowerMessage) ||
    /:\s*\w+/.test(lowerMessage)
  );
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const extractCountryFromMessage = (message: string, context: CompanionTravelContext) => {
  const visitedCountries = Array.from(new Set(context.visitedCountryNames)).sort(
    (first, second) => second.length - first.length
  );

  for (const countryName of visitedCountries) {
    const pattern = new RegExp(`\\b${escapeRegExp(countryName)}\\b`, 'i');
    if (pattern.test(message)) {
      return countryName;
    }
  }

  const worldCatalog = buildWorldCountryCatalog().sort((first, second) => second.length - first.length);
  for (const countryName of worldCatalog) {
    const pattern = new RegExp(`\\b${escapeRegExp(countryName)}\\b`, 'i');
    if (pattern.test(message)) {
      return countryName;
    }
  }

  return context.visitedCountryNames.at(-1) ?? context.visitedCountryNames[0] ?? null;
};

const splitPlaces = (value: string) =>
  value
    .split(/,| and |;/i)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 8);

const extractPlacesFromMessage = (message: string) => {
  const explicitPlacesMatch = message.match(/\bplaces?\b[^:]*[:\-]\s*([^\n.]+)/i);
  if (explicitPlacesMatch?.[1]) {
    return splitPlaces(explicitPlacesMatch[1]);
  }

  const visitedPhraseMatch = message.match(/\bvisited\b\s+([^\n.]+)/i);
  if (visitedPhraseMatch?.[1]) {
    const candidate = visitedPhraseMatch[1]
      .replace(/\bin\s+[A-Za-z\s]+$/i, '')
      .replace(/\bthis country\b/i, '')
      .trim();

    if (candidate) {
      return splitPlaces(candidate);
    }
  }

  return [];
};

const buildCountryPlaceHints = (countryName: string, context: CompanionTravelContext) => {
  const countryKey = canonicalCountryKey(countryName);

  const importedPlaces = context.importedTrips
    .filter((trip) => {
      const primaryNameKey = trip.primaryCountryName ? canonicalCountryKey(trip.primaryCountryName) : '';
      const primaryIdKey = trip.primaryCountryId ? canonicalCountryKey(String(trip.primaryCountryId)) : '';
      return countryKey === primaryNameKey || countryKey === primaryIdKey;
    })
    .flatMap((trip) => trip.locationNames);

  const memoryPlaces = context.memoryPool
    .filter((memory) => memory.countryHint && canonicalCountryKey(memory.countryHint) === countryKey)
    .map((memory) => memory.title.replace(/\s+(note|photo)$/i, '').trim());

  const combined = [...importedPlaces, ...memoryPlaces]
    .map((place) => place.trim())
    .filter(Boolean);

  return Array.from(new Set(combined)).slice(0, 6);
};

// Pulls mood/highlight/sensory/reflection answers from either labeled text or
// numbered responses during the journal-draft chat flow.
const parsePersonalizationInput = (message: string) => {
  const cleanMessage = message.trim();
  const moodMatch = cleanMessage.match(/\b(?:mood|feeling|felt)\b[:\-]?\s*([^\n.]+)/i);
  const highlightMatch = cleanMessage.match(/\b(?:highlight|favorite moment|favourite moment|best moment)\b[:\-]?\s*([^\n.]+)/i);
  const sensoryMatch = cleanMessage.match(/\b(?:detail|sound|smell|taste|food)\b[:\-]?\s*([^\n.]+)/i);
  const reflectionMatch = cleanMessage.match(/\b(?:reflection|lesson|realized|realised|surprised)\b[:\-]?\s*([^\n.]+)/i);

  const numberedSegments = new Map<number, string>();
  const numberedPattern = /(?:^|\s)([1-4])[\).:-]\s*([\s\S]*?)(?=(?:\s[1-4][\).:-]\s*)|$)/g;
  const numberedMatches = Array.from(cleanMessage.matchAll(numberedPattern));

  numberedMatches.forEach((match) => {
    const index = Number(match[1]);
    const value = String(match[2] ?? '').replace(/\s+/g, ' ').trim();
    if (value) {
      numberedSegments.set(index, value);
    }
  });

  return {
    mood: moodMatch?.[1]?.trim() || numberedSegments.get(1) || '',
    highlight: highlightMatch?.[1]?.trim() || numberedSegments.get(2) || '',
    sensory: sensoryMatch?.[1]?.trim() || numberedSegments.get(3) || '',
    reflection: reflectionMatch?.[1]?.trim() || numberedSegments.get(4) || '',
  };
};

// The normalization helpers below turn rough user phrases into sentence pieces
// that can be safely inserted into a deterministic journal draft.
const cleanDetailValue = (value: string) =>
  value
    .replace(/\b[1-4][\).:-]\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[;,:\-]+$/g, '')
    .trim();

const trimToClause = (value: string, maxWords: number) => {
  const firstClause = value.split(/[.?!]/)[0]?.trim() ?? value.trim();
  const words = firstClause.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return firstClause;
  }

  return words.slice(0, maxWords).join(' ');
};

const formatPlaceList = (places: string[]) => {
  const cleanPlaces = places.map((place) => place.trim()).filter(Boolean);

  if (!cleanPlaces.length) {
    return '';
  }

  try {
    return new Intl.ListFormat('en', { style: 'long', type: 'conjunction' }).format(cleanPlaces);
  } catch {
    if (cleanPlaces.length === 1) {
      return cleanPlaces[0];
    }

    if (cleanPlaces.length === 2) {
      return `${cleanPlaces[0]} and ${cleanPlaces[1]}`;
    }

    return `${cleanPlaces.slice(0, -1).join(', ')}, and ${cleanPlaces.at(-1)}`;
  }
};

const lowercaseFirstLetter = (value: string) => {
  if (!value) {
    return value;
  }

  return `${value.charAt(0).toLowerCase()}${value.slice(1)}`;
};

const removeTrailingJoiners = (value: string) => value.replace(/\b(and|or|but)\s*$/i, '').trim();

const normalizeMoodPhrase = (value: string) => {
  let phrase = cleanDetailValue(value)
    .replace(/^(?:i\s+(?:felt|was)\s+|it\s+(?:felt|was)\s+)/i, '')
    .replace(/\bto\s+.+$/i, '')
    .trim();

  phrase = removeTrailingJoiners(trimToClause(phrase, 5));
  phrase = lowercaseFirstLetter(phrase);

  return phrase || 'reflective';
};

const normalizeHighlightPhrase = (value: string) => {
  let phrase = cleanDetailValue(value)
    .replace(/^(?:it\s+was|my\s+highlight\s+was|highlight\s+was)\s+/i, '')
    .replace(/\bfunny to feed\b/gi, 'feeding')
    .replace(/\bsee\s+the\s+culture\s+of\s+the\s+in\s+([A-Za-z]+)/gi, 'experience the culture in $1')
    .replace(/\bsee\s+the\s+culture\s+of\s+the\b/gi, 'experience the culture')
    .replace(/\band\s+see\s+/gi, ' and ')
    .replace(/\bhead butted\b/gi, 'head-butted')
    .replace(/\band\s+people\s+get\s+/gi, ', watching people get ')
    .replace(/\band\s+experience\s+the\s+culture\b/gi, ', and experiencing the culture')
    .trim();

  phrase = trimToClause(phrase, 34);
  phrase = lowercaseFirstLetter(phrase);

  return phrase || 'wandering between places and following local rhythms';
};

const normalizeSensoryPhrase = (value: string) => {
  let phrase = cleanDetailValue(value).trim();
  phrase = trimToClause(phrase, 14);
  phrase = lowercaseFirstLetter(phrase);

  if (!phrase) {
    return 'the mix of street sounds and late-evening light';
  }

  const shortNounLike = phrase.split(/\s+/).length <= 3 && !/\b(?:sound|smell|taste|feeling|noise|wind|forest|air)\b/i.test(phrase);
  if (shortNounLike) {
    return `the feeling around ${phrase}`;
  }

  if (!/^(?:the|a|an|my|this|that)\b/i.test(phrase) && /^[a-z][a-z\s-]{1,40}$/i.test(phrase)) {
    const hasVerbLikeToken = /\b(?:is|are|was|were|be|being|been|feel|felt|smell|smells|sound|sounds|taste|tastes|watch|watching|moving|walk|walking|experience|experiencing)\b/i.test(
      phrase
    );
    if (!hasVerbLikeToken) {
      return `the ${phrase}`;
    }
  }

  return phrase;
};

const normalizeReflectionPhrase = (value: string) => {
  let phrase = cleanDetailValue(value)
    .replace(/^(?:i\s+(?:realized|realised|learned|noticed|felt|knew)\s+|it\s+made\s+me\s+)/i, '')
    .trim();

  phrase = trimToClause(phrase, 20);
  phrase = lowercaseFirstLetter(phrase).replace(/^that\s+/i, '');

  return phrase || 'I knew this was a place I wanted to come back to';
};

const normalizeCountryCapitalization = (text: string, countryName: string) => {
  if (!text || !countryName) {
    return text;
  }

  const pattern = new RegExp(`\\b${escapeRegExp(countryName)}\\b`, 'i');
  return text.replace(pattern, countryName);
};

const normalizeKnownPlaceCapitalization = (text: string, places: string[]) => {
  let normalized = text;

  places.forEach((place) => {
    const cleanPlace = place.trim();
    if (!cleanPlace) {
      return;
    }

    const pattern = new RegExp(`\\b${escapeRegExp(cleanPlace)}\\b`, 'ig');
    normalized = normalized.replace(pattern, cleanPlace);
  });

  return normalized;
};

const normalizeFutureDestinationText = (text: string, places: string[]) =>
  normalizeKnownPlaceCapitalization(text, places)
    .replace(/\buniversal studios\b/gi, 'Universal Studios')
    .replace(
      /\b(go to|go back to|return to|come back to|visit)\s+([a-z][a-z'-]*(?:\s+[a-z][a-z'-]*){0,2})/gi,
      (_match, verb: string, destination: string) =>
        `${verb} ${destination
          .split(/\s+/)
          .filter(Boolean)
          .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
          .join(' ')}`
    );

// Converts future-plan fragments into a full sentence for the closing line of a
// generated journal draft.
const normalizeFuturePlanPhrase = (value: string, countryName: string, places: string[]) => {
  let phrase = cleanDetailValue(value)
    .replace(/^(?:that\s+)?/i, '')
    .replace(/^(?:how\s+)?i\s+(?:want|would\s+love|plan|hope)\s+to\s+/i, 'to ')
    .replace(/^(?:include|add)\s+/i, '')
    .trim();

  phrase = trimToClause(phrase, 24);
  phrase = lowercaseFirstLetter(phrase);
  phrase = normalizeCountryCapitalization(phrase, countryName);
  phrase = normalizeKnownPlaceCapitalization(phrase, places);

  if (!phrase) {
    return '';
  }

  const nextVisitIntent = phrase.match(
    /(?:the\s+)?(?:next|following)\s+time\s+i\s+visit\s+([A-Za-z][A-Za-z\s'-]*?)\s+(?:i\s+)?(?:would\s+love|want|plan|hope)\s+to\s+(.+)/i
  );
  if (nextVisitIntent?.[1] && nextVisitIntent?.[2]) {
    const visitCountry = normalizeCountryCapitalization(nextVisitIntent[1].trim(), countryName);
    const visitAction = normalizeFutureDestinationText(nextVisitIntent[2].trim().replace(/[.?!]+$/g, ''), places);
    return `The next time I visit ${visitCountry}, I would love to ${visitAction}.`;
  }

  if (/\b(?:next|following)\s+time\b/i.test(phrase)) {
    const cleanedAction = phrase
      .replace(/^(?:the\s+)?(?:next|following)\s+time\s+/i, '')
      .replace(/^i\s+visit\s+[A-Za-z][A-Za-z\s'-]*\s*/i, '')
      .replace(/^(?:i\s+)?(?:would\s+love|want|plan|hope)\s+to\s+/i, '')
      .trim()
      .replace(/[.?!]+$/g, '');
    if (cleanedAction) {
      return `The next time I visit ${countryName}, I would love to ${normalizeFutureDestinationText(cleanedAction, places)}.`;
    }
  }

  if (/\b(?:go back|return|come back)\b/i.test(phrase)) {
    const revisitAction = normalizeFutureDestinationText(phrase.replace(/[.?!]+$/g, ''), places);
    return `The next time I visit ${countryName}, I would love to ${revisitAction}.`;
  }

  const startsWithVerbLike = /^(?:to\s+|go\s+|return\s+|visit\s+|come\s+back\s+)/i.test(phrase);
  if (startsWithVerbLike) {
    return `I already know I want ${phrase.replace(/[.?!]+$/g, '')}.`;
  }

  return `I already know I want to ${phrase.replace(/[.?!]+$/g, '')}.`;
};

// Separates generated markdown heading from body so refinement modes can rewrite
// body tone without dropping the title.
const splitDraftHeadingAndBody = (draft: string) => {
  const lines = draft.split('\n');
  const headingIndex = lines.findIndex((line) => /^###\s+/i.test(line.trim()));

  if (headingIndex === -1) {
    return { heading: '', body: draft.trim() };
  }

  return {
    heading: lines[headingIndex].trim(),
    body: lines.slice(headingIndex + 1).join('\n').trim(),
  };
};

// Applies deterministic style refinements to the last generated journal draft.
const refineJournalDraft = (draft: string, mode: 'shorter' | 'poetic' | 'factual') => {
  const { heading, body } = splitDraftHeadingAndBody(draft);
  const sentences = body
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const first = sentences[0] || '';
  const second = sentences[1] || '';
  const third = sentences[2] || '';
  const fourth = sentences[3] || '';

  if (mode === 'shorter') {
    const condensed = [first, second, fourth || third].filter(Boolean).join('\n');
    return [heading, '', condensed].filter(Boolean).join('\n');
  }

  if (mode === 'poetic') {
    const poeticLines = [
      first.replace(/\btraveled through\b/i, 'wandered through'),
      second.replace(/\bstayed with me most\b/i, 'lingered with me'),
      third.replace(/\bWhat I keep replaying most is\b/i, 'What still echoes in me is'),
      fourth.replace(/\bBy the end of the day, I knew\b/i, 'By nightfall, I knew'),
    ].filter(Boolean);

    return [heading, '', poeticLines.join('\n')].filter(Boolean).join('\n');
  }

  const factualLines = [
    first.replace(/\bin such a\b/i, 'in a'),
    second.replace(/\bOne of the moments that stayed with me most was\b/i, 'A highlight was'),
    third.replace(/\bWhat I keep replaying most is\b/i, 'A strong memory was'),
    fourth.replace(/\bBy the end of the day, I knew\b/i, 'By the end of the day, I concluded'),
  ].filter(Boolean);

  return [heading, '', factualLines.join('\n')].filter(Boolean).join('\n');
};

// Builds a complete journal entry draft from extracted country/place details and
// optional personalization answers.
const buildJournalEntryDraft = (
  countryName: string,
  places: string[],
  context: CompanionTravelContext,
  personalization?: ReturnType<typeof parsePersonalizationInput> & { futurePlan?: string }
) => {
  const activePlaces = places.length ? places : ['the city center', 'a local cafe', 'a quiet street'];
  const placeList = formatPlaceList(activePlaces);
  const mood = normalizeMoodPhrase(personalization?.mood || context.topMoods[0] || 'reflective');
  const highlight = normalizeHighlightPhrase(
    personalization?.highlight || `wandering between ${activePlaces.slice(0, 2).join(' and ')}`
  );
  const sensory = normalizeSensoryPhrase(personalization?.sensory || 'the mix of street sounds and late-evening light');
  const reflection = normalizeReflectionPhrase(
    personalization?.reflection || 'I noticed how travel slows me down just enough to pay attention.'
  );
  const reflectionWithCountry = normalizeCountryCapitalization(reflection, countryName);
  const reflectionWithPlaces = normalizeKnownPlaceCapitalization(reflectionWithCountry, activePlaces);
  const futurePlanLine = normalizeFuturePlanPhrase(personalization?.futurePlan || '', countryName, activePlaces);

  return [
    `### ${countryName} Journal Draft`,
    ``,
    `Today in ${countryName}, I traveled through ${placeList} in such a ${mood} mood.`,
    `One of the moments that stayed with me most was ${highlight}.`,
    `What I keep replaying most is ${sensory}, because it made the whole day feel peaceful and real.`,
    `By the end of the day, I knew ${reflectionWithPlaces}.`,
    futurePlanLine,
  ]
    .filter(Boolean)
    .join('\n');
};

// Prevents the chat flow from adding the same future-plan idea repeatedly.
const hasFuturePlanLine = (draft: string) =>
  draft
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .some(
      (line) =>
        !/^One of the moments that stayed with me most was\b/i.test(line) &&
        /\b(?:next time i visit|i would love to|i already know i want to)\b/i.test(line)
    );

// Converts visited country ids into compact passport stamp context for the AI
// companion without sending the full stamp renderer metadata.
const buildPassportStamps = (visitedCountryIds: string[], countryLabels?: Record<string, string>): CompanionPassportStamp[] =>
  visitedCountryIds.map((countryId) => {
    const countryName = getCountryName(countryId, countryLabels);
    const normalizedStampId = normalizeCountryToStampId(countryName);
    const stamp = stampById.get(normalizedStampId);

    if (stamp) {
      return {
        stampId: stamp.id,
        countryName: stamp.country_name,
        region: stamp.region,
        rarity: stamp.rarity,
        collected: true,
      };
    }

    return {
      stampId: normalizedStampId || normalizeCountryToStampId(countryId),
      countryName,
      region: 'Unmapped',
      rarity: 'common',
      collected: true,
    };
  });

// Merges journal, scrapbook, and imported-trip records into one recency-sorted
// memory pool used by prompts, insights, and chat replies.
const buildMemoryPool = (
  journalEntries: CompanionJournalEntry[],
  scrapbookPages: ScrapbookPageData[],
  importedTrips: ImportedTripSnapshot[]
): TravelMemory[] => {
  const journalMemories: TravelMemory[] = journalEntries.map((entry) => ({
    id: `journal-${entry.id}`,
    source: 'journal',
    title: entry.title,
    detail: snippet(entry.content, 200),
    createdAt: entry.createdAt,
    countryHint: entry.countryName,
  }));

  const scrapbookMemories: TravelMemory[] = scrapbookPages.flatMap((page, pageIndex) => {
    const pageLabel = page.title || `Page ${pageIndex + 1}`;

    return page.items.flatMap<TravelMemory>((item) => {
      if (item.type === 'note' && item.text.trim()) {
        return [
          {
            id: `scrapbook-note-${item.id}`,
            source: 'scrapbook-note' as const,
            title: `${pageLabel} note`,
            detail: snippet(item.text, 180),
          },
        ];
      }

      if (item.type === 'photo') {
        return [
          {
            id: `scrapbook-photo-${item.id}`,
            source: 'scrapbook-photo' as const,
            title: `${pageLabel} photo`,
            detail: snippet(item.caption || item.alt || 'Moment captured', 120),
          },
        ];
      }

      return [];
    });
  });

  const tripMemories: TravelMemory[] = importedTrips.map((trip) => ({
    id: `trip-${trip.id}`,
    source: 'trip-import',
    title: trip.title,
    detail: snippet(trip.summary, 180),
    createdAt: trip.importedAt,
    countryHint: trip.primaryCountryName || trip.primaryCountryId,
  }));

  return [...journalMemories, ...scrapbookMemories, ...tripMemories]
    .filter((memory) => Boolean(memory.detail))
    .sort((first, second) => toTimestamp(second.createdAt) - toTimestamp(first.createdAt));
};

// Finds recurring tags so the companion can mention themes without an AI call.
const buildTagFrequency = (journalEntries: CompanionJournalEntry[], importedTrips: ImportedTripSnapshot[]) => {
  const counter = new Map<string, number>();
  const allTags = [
    ...journalEntries.flatMap((entry) => entry.tags),
    ...importedTrips.flatMap((trip) => trip.tags),
  ];

  allTags.forEach((tag) => {
    const normalized = tag.toLowerCase().trim();
    if (!normalized) {
      return;
    }
    counter.set(normalized, (counter.get(normalized) ?? 0) + 1);
  });

  return [...counter.entries()].sort((first, second) => second[1] - first[1]).map(([tag]) => tag);
};

// Finds recurring moods across journal/import data for personality and prompt
// suggestions.
const buildMoodFrequency = (journalEntries: CompanionJournalEntry[], importedTrips: ImportedTripSnapshot[]) => {
  const counter = new Map<string, number>();
  const moods = [...journalEntries.map((entry) => entry.mood), ...importedTrips.map((trip) => trip.mood)];

  moods.forEach((mood) => {
    const normalized = mood.toLowerCase().trim();
    if (!normalized) {
      return;
    }
    counter.set(normalized, (counter.get(normalized) ?? 0) + 1);
  });

  return [...counter.entries()].sort((first, second) => second[1] - first[1]).map(([mood]) => mood);
};

// Chooses a lightweight travel personality profile from keyword signals in the
// user's memory archive.
const buildTravelPersonality = (
  memoryPool: TravelMemory[],
  topTags: string[],
  topMoods: string[]
): TravelPersonalityProfile => {
  const signalText = `${topTags.join(' ')} ${topMoods.join(' ')} ${memoryPool.map((memory) => memory.detail).join(' ')}`.toLowerCase();

  const profiles: Array<TravelPersonalityProfile & { keywords: string[] }> = [
    {
      label: 'Story Archivist',
      description: 'You preserve moments with detail and emotional texture, not just logistics.',
      reasons: ['Frequent journaling', 'Strong reflective tone', 'Memory-first storytelling'],
      keywords: ['journal', 'story', 'memory', 'reflect', 'nostalgic', 'note'],
    },
    {
      label: 'Cultural Curator',
      description: 'You gravitate toward places with history, rituals, and local character.',
      reasons: ['Culture-rich tags', 'Place-based details', 'Theme consistency across trips'],
      keywords: ['museum', 'temple', 'gallery', 'market', 'history', 'cathedral'],
    },
    {
      label: 'Wanderflow Explorer',
      description: 'You collect experiences through movement: walks, routes, and day-by-day discovery.',
      reasons: ['Itinerary rhythm', 'Location diversity', 'Activity-focused memories'],
      keywords: ['walk', 'hike', 'train', 'route', 'trail', 'sunrise', 'city'],
    },
    {
      label: 'Taste & Texture Traveler',
      description: 'Food, atmosphere, and small sensory moments shape your strongest travel memories.',
      reasons: ['Food and street-life cues', 'Mood variety', 'Vivid sensory snippets'],
      keywords: ['cafe', 'coffee', 'dinner', 'breakfast', 'street', 'market', 'wine'],
    },
  ];

  const scoredProfiles = profiles.map((profile) => ({
    profile,
    score: profile.keywords.reduce((score, keyword) => score + (signalText.includes(keyword) ? 1 : 0), 0),
  }));
  const bestProfile = scoredProfiles.sort((first, second) => second.score - first.score)[0];

  if (bestProfile && bestProfile.score > 0) {
    return {
      label: bestProfile.profile.label,
      description: bestProfile.profile.description,
      reasons: bestProfile.profile.reasons,
    };
  }

  if (topMoods[0]?.includes('excited') || topMoods[0]?.includes('happy')) {
    return {
      label: 'Momentum Traveler',
      description: 'Your memories favor energy, discovery, and high-signal moments on the move.',
      reasons: ['Upbeat mood pattern', 'Consistent activity tracking', 'Strong trip-to-trip continuity'],
    };
  }

  return {
    label: 'Reflective Explorer',
    description: 'You travel with curiosity and process experiences deeply after the moment passes.',
    reasons: ['Reflective journal tone', 'Balanced structure and spontaneity', 'Memory-first travel habits'],
  };
};

// Creates the high-level archive summary used in the companion dashboard and
// welcome message.
const buildTripSummary = (context: {
  journalEntries: CompanionJournalEntry[];
  importedTrips: ImportedTripSnapshot[];
  visitedCountryNames: string[];
  memoryPool: TravelMemory[];
}): CompanionTripSummary => {
  const { journalEntries, importedTrips, visitedCountryNames, memoryPool } = context;
  const latestJournalEntry = journalEntries[0];
  const latestJournalCountry = latestJournalEntry?.countryName ?? '';
  const journalHighlights = journalEntries.slice(0, 3).map((entry) => entry.title);
  const importHighlights = importedTrips.slice(0, 3).map((trip) => trip.title);
  const memoryHighlights = memoryPool.slice(0, 3).map((memory) => memory.title).filter(Boolean);
  const journalEntryLabel = `${journalEntries.length} journal entr${journalEntries.length === 1 ? 'y' : 'ies'} saved`;
  const mapCoverageLabel = `${visitedCountryNames.length} countr${visitedCountryNames.length === 1 ? 'y' : 'ies'} tracked on your map`;

  const nextFocus =
    journalEntries.length === 0
      ? 'Start with a first journal entry so your future recaps can capture tone shifts.'
      : importedTrips.length === 0
        ? 'Import one itinerary or screenshot set so the companion can generate richer day-by-day recaps.'
        : 'Keep tagging journal entries with place + mood to sharpen future AI reflections.';

  return {
    headline: journalEntryLabel,
    coverage: [
      latestJournalCountry ? `Latest journal focus: ${latestJournalCountry}.` : mapCoverageLabel,
      `Imported trip drafts: ${importedTrips.length}.`,
      latestJournalCountry ? mapCoverageLabel : '',
    ]
      .filter(Boolean)
      .join(' '),
    highlights: journalHighlights.length
      ? journalHighlights
      : importHighlights.length
        ? importHighlights
        : memoryHighlights.length
          ? memoryHighlights
          : ['Your next highlight will appear once a new memory is added.'],
    nextFocus,
  };
};

// Picks a simple next stamp target for insight cards based on what the user has
// already collected.
const getStampRecommendationsText = (passportStamps: CompanionPassportStamp[]) => {
  const collectedIds = new Set(passportStamps.map((stamp) => stamp.stampId));
  const candidate = COUNTRY_STAMPS.find((stamp) => !collectedIds.has(stamp.id));

  if (!candidate) {
    return 'Your current stamp collection is complete for the available catalog.';
  }

  const regionMatch = COUNTRY_STAMPS.find(
    (stamp) => !collectedIds.has(stamp.id) && passportStamps.some((owned) => owned.region === stamp.region)
  );
  const target = regionMatch ?? candidate;

  return `Next collectible target: ${target.country_name} (${target.region}, ${target.rarity}).`;
};

type DestinationRecommendation = {
  countryName: string;
  region: string;
  rarity: string;
  reason: string;
};

const rarityWeight: Record<string, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
};

// Builds all known visited stamp identifiers so recommendations do not point at
// countries already represented in the archive.
const getVisitedStampIds = (context: CompanionTravelContext) => {
  const collected = new Set<string>();

  context.passportStamps.forEach((stamp) => collected.add(stamp.stampId));
  context.passportStamps.forEach((stamp) => collected.add(normalizeCountryToStampId(stamp.countryName)));
  context.visitedCountryNames.forEach((countryName) => collected.add(normalizeCountryToStampId(countryName)));

  return collected;
};

// Adds stamp region/rarity metadata to country-name recommendations.
const getCountryRecommendationMeta = (countryName: string) => {
  const stamp = stampById.get(normalizeCountryToStampId(countryName));

  return {
    region: stamp?.region ?? 'Global',
    rarity: stamp?.rarity ?? 'standard',
  };
};

// Looks for route-adjacent suggestions based on the most recent visited country.
const getNearbySuggestionsFromRecentCountry = (
  recentCountryName: string | undefined,
  isUnvisited: (countryName: string) => boolean
) => {
  if (!recentCountryName) {
    return [];
  }

  const nearby = nearbyDestinationHints[recentCountryName];
  if (!nearby) {
    return [];
  }

  return nearby.filter(isUnvisited);
};

// Uses the derived travel personality to seed recommendation candidates.
const getPersonalitySuggestionPool = (personalityLabel: string, isUnvisited: (countryName: string) => boolean) => {
  const pool = personalityDestinationHints[personalityLabel] ?? personalityDestinationHints['Reflective Explorer'];
  return pool.filter(isUnvisited);
};

// Combines nearby, personality, region, stamp-rarity, and catalog fallbacks into
// up to three next-destination recommendations.
const buildNextDestinationRecommendations = (context: CompanionTravelContext): DestinationRecommendation[] => {
  const visitedStampIds = getVisitedStampIds(context);
  const visitedRegionCount = new Map<string, number>();
  const visitedCountryNameSet = new Set(context.visitedCountryNames.map((countryName) => canonicalCountryKey(countryName)));
  const worldCatalog = buildWorldCountryCatalog();
  const unvisitedCatalog = worldCatalog.filter(
    (countryName) => !visitedCountryNameSet.has(canonicalCountryKey(countryName))
  );
  const wildcardDestinationList = [
    'Portugal',
    'Greece',
    'Japan',
    'Iceland',
    'New Zealand',
    'Chile',
    'Peru',
    'Vietnam',
    'Thailand',
    'Turkey',
    'Croatia',
    'Morocco',
    'Indonesia',
    'Norway',
    'South Africa',
    'Argentina',
    'Colombia',
  ];

  context.passportStamps.forEach((stamp) => {
    if (stamp.region === 'Unmapped') {
      return;
    }
    visitedRegionCount.set(stamp.region, (visitedRegionCount.get(stamp.region) ?? 0) + 1);
  });

  const sortedRegions = [...visitedRegionCount.entries()].sort((first, second) => second[1] - first[1]);
  const topRegion = sortedRegions[0]?.[0] ?? null;
  const availableStamps = COUNTRY_STAMPS.filter((stamp) => !visitedStampIds.has(stamp.id));
  const usedCountries = new Set<string>();
  const picked: DestinationRecommendation[] = [];
  const recentCountryName = context.visitedCountryNames.at(-1);
  const isUnvisited = (countryName: string) => !visitedCountryNameSet.has(canonicalCountryKey(countryName));
  // Local helper enforces de-duplication and the "unvisited only" rule for every
  // recommendation source.
  const addRecommendation = (countryName: string, reason: string) => {
    const key = canonicalCountryKey(countryName);

    if (!key || usedCountries.has(key) || !isUnvisited(countryName)) {
      return;
    }

    usedCountries.add(key);
    const meta = getCountryRecommendationMeta(countryName);
    picked.push({
      countryName,
      region: meta.region,
      rarity: meta.rarity,
      reason,
    });
  };

  // Prefer rarer collectible stamps when multiple recommendation candidates are
  // otherwise equally valid.
  const pickCandidate = (candidates: typeof COUNTRY_STAMPS) =>
    [...candidates]
      .sort((first, second) => {
        const rarityDelta = (rarityWeight[second.rarity] ?? 0) - (rarityWeight[first.rarity] ?? 0);
        if (rarityDelta !== 0) {
          return rarityDelta;
        }

        return first.country_name.localeCompare(second.country_name);
      })
      .find((candidate) => !usedCountries.has(canonicalCountryKey(candidate.country_name)));

  const nearbySuggestions = getNearbySuggestionsFromRecentCountry(recentCountryName, isUnvisited);
  if (nearbySuggestions.length) {
    const nearbyCountryName = nearbySuggestions[0];
    addRecommendation(
      nearbyCountryName,
      `This is a strong next hop from ${recentCountryName}, based on your recent route pattern.`
    );
  }

  const personalitySuggestions = getPersonalitySuggestionPool(context.personality.label, isUnvisited);
  if (personalitySuggestions.length && picked.length < 3) {
    const personalityCountryName = personalitySuggestions[0];
    addRecommendation(
      personalityCountryName,
      `${personalityCountryName} matches your ${context.personality.label.toLowerCase()} travel style.`
    );
  }

  if (topRegion) {
    const regionalCandidate = pickCandidate(availableStamps.filter((stamp) => stamp.region === topRegion));
    if (regionalCandidate) {
      addRecommendation(
        regionalCandidate.country_name,
        `You already have momentum in ${topRegion}; this keeps that chapter going with a new country.`
      );
    }
  }

  const unseenRegionCandidate = pickCandidate(
    availableStamps.filter((stamp) => !visitedRegionCount.has(stamp.region))
  );
  if (unseenRegionCandidate) {
    addRecommendation(
      unseenRegionCandidate.country_name,
      `${unseenRegionCandidate.region} is less represented in your archive, so this adds range to your travel map.`
    );
  }

  wildcardDestinationList.forEach((countryName) => {
    if (picked.length >= 3) {
      return;
    }

    if (!unvisitedCatalog.some((candidateName) => canonicalCountryKey(candidateName) === canonicalCountryKey(countryName))) {
      return;
    }

    addRecommendation(
      countryName,
      `${countryName} is still unvisited in your map and is a high-signal addition to your memory archive.`
    );
  });

  if (picked.length < 3 && unvisitedCatalog.length) {
    const offset = context.visitedCountryIds.length % unvisitedCatalog.length;
    for (let index = 0; index < unvisitedCatalog.length && picked.length < 3; index += 1) {
      const candidateCountry = unvisitedCatalog[(offset + index) % unvisitedCatalog.length];
      addRecommendation(
        candidateCountry,
        `${candidateCountry} is currently unvisited and keeps your travel coverage expanding.`
      );
    }
  }

  return picked;
};

// Public context builder used by the companion page. It normalizes raw app data
// into the single archive object consumed by chat, prompts, and insight cards.
export const buildTravelCompanionContext = ({
  journalEntries,
  scrapbookPages,
  importedTrips,
  visitedCountryIds,
  countryLabels,
}: BuildCompanionContextInput): CompanionTravelContext => {
  const normalizedEntries = journalEntries
    .map((entry) => normalizeJournalEntry(entry, countryLabels))
    .sort((first, second) => toTimestamp(second.createdAt) - toTimestamp(first.createdAt));
  const visitedCountryNames = visitedCountryIds.map((countryId) => getCountryName(countryId, countryLabels));
  const passportStamps = buildPassportStamps(visitedCountryIds, countryLabels);
  const memoryPool = buildMemoryPool(normalizedEntries, scrapbookPages, importedTrips);
  const topTags = buildTagFrequency(normalizedEntries, importedTrips).slice(0, 6);
  const topMoods = buildMoodFrequency(normalizedEntries, importedTrips).slice(0, 4);
  const personality = buildTravelPersonality(memoryPool, topTags, topMoods);
  const tripSummary = buildTripSummary({
    journalEntries: normalizedEntries,
    importedTrips,
    visitedCountryNames,
    memoryPool,
  });

  return {
    journalEntries: normalizedEntries,
    scrapbookPages,
    importedTrips,
    visitedCountryIds,
    visitedCountryNames,
    passportStamps,
    memoryPool,
    topTags,
    topMoods,
    personality,
    tripSummary,
  };
};

// Creates deterministic writing prompts from recent archive context.
export const buildJournalSuggestions = (context: CompanionTravelContext) => {
  const latestEntry = context.journalEntries[0];
  const latestCountry = latestEntry?.countryName || context.visitedCountryNames[0] || 'your latest stop';
  const latestTitle = latestEntry?.title || latestCountry;
  const secondEntry = context.journalEntries.find((entry) => entry.id !== latestEntry?.id);
  const comparisonAnchor = secondEntry?.title || context.visitedCountryNames.find((country) => country !== latestCountry) || latestCountry;
  const mood = context.topMoods[0] || 'reflective';

  if (latestEntry) {
    return [
      `Write a sensory follow-up to "${latestTitle}" in ${latestCountry} using one smell, one sound, and one surprise.`,
      `Create a then-vs-now reflection between "${latestTitle}" and ${comparisonAnchor}.`,
      `Expand the ${mood} thread in "${latestTitle}": what changed in how you moved through the day?`,
    ];
  }

  return [
    `Write a sensory vignette from ${latestCountry} using one smell, one sound, and one surprise.`,
    `Create a then-vs-now reflection between ${latestCountry} and ${comparisonAnchor}.`,
    `Expand your ${mood} thread: what changed in how you moved through the day?`,
  ];
};

// Creates caption ideas, preferring current journal entries before older local
// scrapbook photos so the visible studio mirrors the saved journal archive.
export const buildCaptionIdeas = (context: CompanionTravelContext) => {
  const journalCaptionIdeas = context.journalEntries.slice(0, 3).map((entry) => {
    const anchor = snippet(entry.content, 64) || entry.title;

    return `“${anchor}” — ${entry.title}`;
  });

  if (journalCaptionIdeas.length) {
    return journalCaptionIdeas;
  }

  const scrapbookPhotoMemories = context.memoryPool.filter((memory) => memory.source === 'scrapbook-photo').slice(0, 3);

  if (!scrapbookPhotoMemories.length) {
    return [
      'Golden hour, open passport, and the city finally feels familiar.',
      'A quiet street that turned into the loudest memory of the day.',
      'Pinned this moment before the next train pulled me forward.',
    ];
  }

  return scrapbookPhotoMemories.map((memory) => `“${snippet(memory.detail, 64)}” — ${memory.title}`);
};

// Surfaces reflection cards from the newest memories, with an empty-state card
// before the user has saved any memory content.
export const buildTravelReflections = (context: CompanionTravelContext): TravelReflection[] => {
  const journalReflections = context.journalEntries.slice(0, 3).map((entry) => ({
    id: createCompanionId(),
    title: entry.title,
    reflection: `This saved journal entry is the strongest current signal for ${entry.countryName}. Use it to deepen the place, mood, and moment already in your archive.`,
    anchor: snippet(entry.content, 84) || `${entry.countryName} · ${entry.mood}`,
  }));

  if (journalReflections.length) {
    return journalReflections;
  }

  const topMemories = context.memoryPool.slice(0, 3);

  if (!topMemories.length) {
    return [
      {
        id: createCompanionId(),
        title: 'Your Memory Arc',
        reflection: 'As soon as you add entries, I will surface patterns in tone, pace, and place.',
        anchor: 'Waiting on first memory',
      },
    ];
  }

  return topMemories.map((memory) => ({
    id: createCompanionId(),
    title: memory.title,
    reflection: `You keep returning to moments like this because they combine place with feeling, not just events.`,
    anchor: snippet(memory.detail, 84),
  }));
};

// Builds the prompt chips shown in the companion UI.
export const buildSuggestedPrompts = (context: CompanionTravelContext): SuggestedPrompt[] => {
  const leadCountry = context.visitedCountryNames[0] || 'my latest trip';
  const leadEntry = context.journalEntries[0]?.title || 'my last entry';

  return [
    {
      id: 'prompt-recap',
      title: 'Trip Recap',
      prompt: `Give me a cinematic recap of ${leadCountry} from my saved memories.`,
      intent: 'trip-recap',
    },
    {
      id: 'prompt-country-count',
      title: 'Visited Count',
      prompt: 'How many countries have I visited so far, and which ones are they?',
      intent: 'country-stats',
    },
    {
      id: 'prompt-next-country',
      title: 'Where Next',
      prompt: 'Based on my visited countries, where should I go next?',
      intent: 'next-destination',
    },
    {
      id: 'prompt-journal',
      title: 'Journal Draft',
      prompt: `Generate 3 journal follow-up prompts based on "${leadEntry}".`,
      intent: 'journal-suggestions',
    },
    {
      id: 'prompt-journal-entry',
      title: 'Write Entry',
      prompt: `Write a journal entry for my places in ${leadCountry}, then ask me for details to personalize it.`,
      intent: 'journal-entry',
    },
    {
      id: 'prompt-captions',
      title: 'Scrapbook Captions',
      prompt: 'Suggest scrapbook captions from my recent photos and notes.',
      intent: 'scrapbook-captions',
    },
    {
      id: 'prompt-stamps',
      title: 'Stamp Strategy',
      prompt: 'Recommend which passport stamp I should chase next and why.',
      intent: 'passport-stamps',
    },
  ];
};

// Builds the compact insight cards displayed beside the chat experience.
export const buildMemoryInsights = (context: CompanionTravelContext): MemoryInsight[] => {
  const latestEntry = context.journalEntries[0];

  if (latestEntry) {
    const tagSummary = latestEntry.tags.length ? latestEntry.tags.slice(0, 3).join(', ') : 'no tags yet';

    return [
      {
        id: 'current-entry',
        title: latestEntry.title,
        detail: `Your newest saved journal entry is set in ${latestEntry.countryName} with a ${latestEntry.mood} mood. The companion should use this as the current memory anchor.`,
        cta: `${context.journalEntries.length} journal entr${context.journalEntries.length === 1 ? 'y' : 'ies'} saved`,
      },
      {
        id: 'journal-organization',
        title: 'Journal Organization',
        detail: `Current tags: ${tagSummary}. Add place + mood tags to this entry when you want sharper future reflections.`,
        cta: 'Journal entries first',
      },
      {
        id: 'passport',
        title: 'Passport Recommendation',
        detail: getStampRecommendationsText(context.passportStamps),
        cta: `${context.passportStamps.length} stamps currently mapped`,
      },
    ];
  }

  return [
    {
      id: 'personality',
      title: context.personality.label,
      detail: context.personality.description,
      cta: context.personality.reasons[0],
    },
    {
      id: 'organization',
      title: 'Memory Organization',
      detail: context.topTags.length
        ? `Your strongest tags are ${context.topTags.slice(0, 3).join(', ')}. Group pages by tag + mood to keep retrieval fast.`
        : 'Start by tagging each new entry with mood + place to unlock stronger clustering.',
      cta: 'Try one tag set per trip day',
    },
    {
      id: 'passport',
      title: 'Passport Recommendation',
      detail: getStampRecommendationsText(context.passportStamps),
      cta: `${context.passportStamps.length} stamps currently mapped`,
    },
  ];
};

// Bundles all non-chat companion surfaces in one call for the page hook.
export const buildCompanionInsights = (context: CompanionTravelContext): CompanionInsightBundle => ({
  prompts: buildSuggestedPrompts(context),
  journalSuggestions: buildJournalSuggestions(context),
  captionIdeas: buildCaptionIdeas(context),
  reflections: buildTravelReflections(context),
  insightCards: buildMemoryInsights(context),
});

// Routes a user message to the deterministic response formatter that best
// matches the request.
const resolveIntent = (message: string): TravelCompanionIntent => {
  if (hasNextDestinationQuestion(message)) {
    return 'next-destination';
  }

  if (hasCountryStatsQuestion(message)) {
    return 'country-stats';
  }

  const lowerMessage = message.toLowerCase();

  const matchedIntent = (Object.keys(intentKeywords) as TravelCompanionIntent[]).find((intent) => {
    if (intent === 'general') {
      return false;
    }

    return intentKeywords[intent].some((keyword) => lowerMessage.includes(keyword));
  });

  return matchedIntent ?? 'general';
};

// Formats the "how many countries" answer using map ids plus resolved labels.
const formatCountryStatsReply = (context: CompanionTravelContext) => {
  const uniqueCountryIds = Array.from(new Set(context.visitedCountryIds.map((countryId) => countryId.trim()).filter(Boolean)));
  const uniqueCountries = Array.from(new Set(context.visitedCountryNames.map((countryName) => countryName.trim()).filter(Boolean)));
  const namedCountries = uniqueCountries.filter((countryName) => !isNumericCountryCode(countryName));
  const unresolvedCount = Math.max(0, uniqueCountryIds.length - namedCountries.length);

  if (!uniqueCountryIds.length) {
    return [
      'You have visited 0 countries so far.',
      'Start by scratching one country on the map, then I can track and compare your route history.',
    ].join('\n');
  }

  const countryList = namedCountries.map((countryName) => `- ${countryName}`).join('\n');
  const regions = Array.from(new Set(context.passportStamps.map((stamp) => stamp.region).filter((region) => region !== 'Unmapped')));

  return [
    `You have visited ${uniqueCountryIds.length} countr${uniqueCountryIds.length === 1 ? 'y' : 'ies'} so far.`,
    namedCountries.length ? 'Visited countries:' : 'Visited countries (named):',
    namedCountries.length ? countryList : '- I am still resolving names for your current map IDs.',
    unresolvedCount ? `${unresolvedCount} entr${unresolvedCount === 1 ? 'y is' : 'ies are'} still stored as map IDs and need name resolution.` : '',
    regions.length ? `Regions represented: ${regions.join(', ')}.` : 'No mapped stamp regions yet.',
  ]
    .filter(Boolean)
    .join('\n');
};

// Formats next-destination recommendations into a plain chat response.
const formatNextDestinationReply = (context: CompanionTravelContext) => {
  const recommendations = buildNextDestinationRecommendations(context);

  if (!recommendations.length) {
    return [
      'I could not find an unvisited country recommendation from the current catalog.',
      'Try adding more visited countries or imported trips so I can refine the route strategy.',
    ].join('\n');
  }

  const recommendationLines = recommendations
    .map((item, index) => `${index + 1}. ${item.countryName} (${item.region}, ${item.rarity}) — ${item.reason}`)
    .join('\n');

  const anchor = context.visitedCountryNames.length
    ? `I used your ${context.visitedCountryNames.length} visited countries as the baseline.`
    : 'I used your current journal and stamp context as the baseline.';

  return [
    'Here are smart next-trip ideas based on your visited-country history:',
    recommendationLines,
    anchor,
  ].join('\n');
};

// Summarizes the user's passport collection and next collectible target.
const formatPassportReply = (context: CompanionTravelContext) => {
  const topStamps = context.passportStamps.slice(0, 4);
  const stampList = topStamps.length
    ? topStamps.map((stamp) => `- ${stamp.countryName} (${stamp.region}, ${stamp.rarity})`).join('\n')
    : '- No collected stamps yet';

  return [
    'Passport collection readout:',
    stampList,
    getStampRecommendationsText(context.passportStamps),
  ].join('\n');
};

// Turns the archive summary into a concise recap response.
const formatTripRecapReply = (context: CompanionTravelContext) => {
  const highlights = context.tripSummary.highlights.map((item) => `- ${item}`).join('\n');

  return [
    context.tripSummary.headline,
    context.tripSummary.coverage,
    'Highlights:',
    highlights,
    context.tripSummary.nextFocus,
  ].join('\n');
};

// Returns journal prompt suggestions as a chat message body.
const formatJournalReply = (context: CompanionTravelContext) =>
  ['Here are fresh journal prompts from your travel archive:', ...buildJournalSuggestions(context).map((item) => `- ${item}`)].join('\n');

// Returns memory reflections as a chat message body.
const formatReflectionReply = (context: CompanionTravelContext) =>
  buildTravelReflections(context)
    .map((reflection) => `${reflection.title}: ${reflection.reflection} (${reflection.anchor})`)
    .join('\n');

// Returns scrapbook caption suggestions as a chat message body.
const formatCaptionReply = (context: CompanionTravelContext) =>
  ['Caption ideas pulled from your scrapbook context:', ...buildCaptionIdeas(context).map((caption) => `- ${caption}`)].join('\n');

// Explains the derived travel personality and its supporting reasons.
const formatPersonalityReply = (context: CompanionTravelContext) => {
  const reasons = context.personality.reasons.map((reason) => `- ${reason}`).join('\n');

  return [
    `Travel personality: ${context.personality.label}`,
    context.personality.description,
    reasons,
  ].join('\n');
};

// Suggests lightweight organization tactics from tags and moods.
const formatOrganizationReply = (context: CompanionTravelContext) => {
  const tags = context.topTags.slice(0, 4).join(', ') || 'no recurring tags yet';
  const moods = context.topMoods.slice(0, 3).join(', ') || 'no recurring moods yet';

  return [
    'Memory organization plan:',
    `- Core tags: ${tags}`,
    `- Recurring moods: ${moods}`,
    '- Organize scrapbook pages by trip day and reuse one caption style per day.',
  ].join('\n');
};

// Default reply when the companion cannot infer a more specific intent.
const formatGeneralReply = (context: CompanionTravelContext) => {
  const latestMemory = context.memoryPool[0];
  const memoryLine = latestMemory ? `Latest memory anchor: ${latestMemory.title}.` : 'No saved memory yet.';

  return [
    `I am tracking ${context.journalEntries.length} journal entries, ${context.scrapbookPages.length} scrapbook pages, and ${context.passportStamps.length} stamp links.`,
    memoryLine,
    'Try asking: "How many countries have I visited?", "Where should I go next?", or "Write a journal entry for places I visited in [country]."',
  ].join('\n');
};

// Initial assistant message after the archive context has loaded.
export const buildWelcomeMessage = (context: CompanionTravelContext) => {
  const savedMemoryCount = context.journalEntries.length + context.scrapbookPages.length + context.importedTrips.length;

  if (!savedMemoryCount) {
    const countries = context.visitedCountryNames.slice(0, 3).join(', ');

    return [
      `I have synced with your travel archive: ${context.journalEntries.length} journal entries, ${context.scrapbookPages.length} scrapbook pages, and ${context.importedTrips.length} imported trips.`,
      countries
        ? `I can see ${countries} on your map, but I do not have saved journal or scrapbook details for them yet.`
        : 'Add a journal entry, scrapbook page, or imported trip and I will use it as memory context.',
    ].join(' ');
  }

  const countries = context.visitedCountryNames.slice(0, 3).join(', ') || 'your saved trips';

  return `I have synced with your travel archive: ${context.journalEntries.length} journal entries, ${context.scrapbookPages.length} scrapbook pages, and ${context.importedTrips.length} imported trips. I am ready to help you turn ${countries} into richer stories.`;
};

// Handles the multi-turn journal-entry drafting flow before generic companion
// replies run. This keeps draft refinement deterministic and session-aware.
export const handleJournalEntryInteraction = (
  message: string,
  context: CompanionTravelContext,
  activeSession: JournalDraftSession | null
): JournalEntryInteractionResult => {
  if (activeSession) {
    // A refinement keyword rewrites the last draft while preserving the active
    // country/place session.
    const refinementMode = getRefinementMode(message);

    if (refinementMode) {
      const refinedDraft = refineJournalDraft(activeSession.lastDraft, refinementMode);

      return {
        handled: true,
        response: {
          id: createCompanionId(),
          role: 'assistant',
          createdAt: new Date().toISOString(),
          intent: 'journal-entry',
          content: [
            `Great call. Here is a ${refinementMode} version:`,
            '',
            refinedDraft,
            '',
            'You can keep iterating with: "shorter", "more poetic", "more factual", or "include ...".',
          ].join('\n'),
        },
        nextSession: {
          ...activeSession,
          lastDraft: refinedDraft,
        },
      };
    }
  }

  if (activeSession && (hasPersonalizationSignal(message) || hasDraftAugmentSignal(message))) {
    // Personalization answers are merged with earlier session details so the
    // user can add one detail at a time.
    const parsedDetails = parsePersonalizationInput(message);
    const includeText = hasDraftAugmentSignal(message)
      ? message.replace(/^\s*(?:include|add|also include|also add)\s*/i, '').trim()
      : '';
    const includeLooksFuturePlan = futurePlanSignalPattern.test(includeText);

    const mergedDetails = {
      mood: parsedDetails.mood || activeSession.personalDetails?.mood || '',
      highlight:
        parsedDetails.highlight ||
        (!includeLooksFuturePlan ? includeText : '') ||
        activeSession.personalDetails?.highlight ||
        '',
      sensory: parsedDetails.sensory || activeSession.personalDetails?.sensory || '',
      reflection: parsedDetails.reflection || activeSession.personalDetails?.reflection || '',
      futurePlan:
        (includeLooksFuturePlan ? includeText : '') ||
        activeSession.personalDetails?.futurePlan ||
        '',
    };

    let revisedDraft = buildJournalEntryDraft(activeSession.countryName, activeSession.places, context, mergedDetails);

    if (includeText && includeLooksFuturePlan && !hasFuturePlanLine(revisedDraft)) {
      revisedDraft = buildJournalEntryDraft(activeSession.countryName, activeSession.places, context, {
        ...mergedDetails,
        futurePlan: includeText,
      });
    }

    return {
      handled: true,
      response: {
        id: createCompanionId(),
        role: 'assistant',
        createdAt: new Date().toISOString(),
        intent: 'journal-entry',
        content: [
          'Love that detail set. Here is a more personal version:',
          '',
          revisedDraft,
          '',
          'If you want another pass, tell me whether you want it shorter, more poetic, or more factual.',
        ].join('\n'),
      },
      nextSession: {
        ...activeSession,
        lastDraft: revisedDraft,
        personalDetails: mergedDetails,
      },
    };
  }

  if (!hasJournalEntryRequest(message)) {
    return { handled: false, nextSession: activeSession };
  }

  // Starting a draft requires at least a country. Places can come from the user
  // message or from existing memory/import hints for that country.
  const countryName = extractCountryFromMessage(message, context);

  if (!countryName) {
    return {
      handled: true,
      response: {
        id: createCompanionId(),
        role: 'assistant',
        createdAt: new Date().toISOString(),
        intent: 'journal-entry',
        content:
          'I can draft that. Tell me the country first, then list the places you visited, and I will create the entry.',
      },
      nextSession: activeSession,
    };
  }

  const explicitPlaces = extractPlacesFromMessage(message);
  const hintedPlaces = buildCountryPlaceHints(countryName, context);
  const places = explicitPlaces.length ? explicitPlaces : hintedPlaces;
  const draft = buildJournalEntryDraft(countryName, places, context);
  const placeLine = places.length ? places.join(', ') : 'no specific places detected yet';

  return {
    handled: true,
    response: {
      id: createCompanionId(),
      role: 'assistant',
      createdAt: new Date().toISOString(),
      intent: 'journal-entry',
      content: [
        `Here is a first draft based on ${countryName} (${placeLine}):`,
        '',
        draft,
        '',
        'To make it more personal, send 3-4 quick details:',
        '1) mood you felt',
        '2) your standout moment',
        '3) one sensory detail (sound/smell/taste)',
        '4) one reflection you had',
      ].join('\n'),
    },
    nextSession: {
      countryName,
      places,
      lastDraft: draft,
      personalDetails: {},
    },
  };
};

// Generates a one-shot deterministic companion reply for non-session chat
// messages.
export const generateCompanionReply = (message: string, context: CompanionTravelContext): CompanionChatMessage => {
  const intent = resolveIntent(message);
  const content =
    intent === 'country-stats'
      ? formatCountryStatsReply(context)
      : intent === 'next-destination'
        ? formatNextDestinationReply(context)
        : intent === 'journal-entry'
          ? 'Tell me the country and places you visited, and I will draft a journal entry and then personalize it with your input.'
        : intent === 'journal-suggestions'
      ? formatJournalReply(context)
      : intent === 'memory-reflections'
        ? formatReflectionReply(context)
        : intent === 'trip-recap'
          ? formatTripRecapReply(context)
          : intent === 'scrapbook-captions'
            ? formatCaptionReply(context)
            : intent === 'travel-personality'
              ? formatPersonalityReply(context)
              : intent === 'memory-organization'
                ? formatOrganizationReply(context)
                : intent === 'passport-stamps'
                  ? formatPassportReply(context)
                  : formatGeneralReply(context);

  return {
    id: createCompanionId(),
    role: 'assistant',
    content,
    createdAt: new Date().toISOString(),
    intent,
  };
};

// Normalizes raw input into the same message shape used by assistant replies.
export const buildUserMessage = (text: string): CompanionChatMessage => ({
  id: createCompanionId(),
  role: 'user',
  content: text.trim(),
  createdAt: new Date().toISOString(),
  intent: 'general',
});

// Formats chat timestamps for display while tolerating invalid legacy values.
export const formatTimestamp = (isoTimestamp: string) => {
  const date = new Date(isoTimestamp);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return dateFormatter.format(date);
};
