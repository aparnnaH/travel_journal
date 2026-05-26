import { COUNTRY_STAMPS } from '@/data/stamps/countries';
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
};

const stampById = new Map(COUNTRY_STAMPS.map((stamp) => [stamp.id, stamp]));
const countryById = new Map(placeholderCountries.map((country) => [country.id, country]));
const countryByCode = new Map(placeholderCountries.map((country) => [country.code, country]));
const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const intentKeywords: Record<TravelCompanionIntent, string[]> = {
  general: [],
  'journal-suggestions': ['journal', 'prompt', 'write', 'entry', 'story', 'draft'],
  'memory-reflections': ['reflect', 'memory', 'remember', 'nostalgia', 'reflection'],
  'trip-recap': ['recap', 'summary', 'summarize', 'trip', 'itinerary'],
  'scrapbook-captions': ['caption', 'photo', 'scrapbook', 'polaroid'],
  'travel-personality': ['personality', 'style', 'traveler', 'traveller', 'pattern'],
  'memory-organization': ['organize', 'organise', 'sort', 'tag', 'folder', 'cleanup', 'clean up'],
  'passport-stamps': ['stamp', 'passport', 'seal', 'collection', 'region'],
};

const createCompanionId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

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

const getCountryName = (countryId: string) => {
  const knownCountry = countryById.get(countryId) || countryByCode.get(countryId);

  if (knownCountry) {
    return knownCountry.name;
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

const normalizeJournalEntry = (entry: RawJournalEntry): CompanionJournalEntry => ({
  id: String(entry.id ?? createCompanionId()),
  title: String(entry.title ?? 'Untitled memory'),
  content: String(entry.content ?? ''),
  countryId: String(entry.countryId ?? entry.country_id ?? 'Unknown'),
  mood: String(entry.mood ?? 'reflective'),
  tags: Array.isArray(entry.tags) ? entry.tags.map((tag) => String(tag).trim()).filter(Boolean) : [],
  createdAt: String(entry.createdAt ?? entry.created_at ?? new Date().toISOString()),
});

const toTimestamp = (value?: string) => (value ? new Date(value).getTime() || 0 : 0);

const buildPassportStamps = (visitedCountryIds: string[]): CompanionPassportStamp[] =>
  visitedCountryIds.map((countryId) => {
    const countryName = getCountryName(countryId);
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
    countryHint: getCountryName(entry.countryId),
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

const buildTripSummary = (context: {
  journalEntries: CompanionJournalEntry[];
  importedTrips: ImportedTripSnapshot[];
  visitedCountryNames: string[];
  memoryPool: TravelMemory[];
}): CompanionTripSummary => {
  const { journalEntries, importedTrips, visitedCountryNames, memoryPool } = context;
  const lastCountry = visitedCountryNames[0] || 'your recent routes';
  const latestHighlights = memoryPool.slice(0, 3).map((memory) => memory.title);

  const nextFocus =
    journalEntries.length === 0
      ? 'Start with a first journal entry so your future recaps can capture tone shifts.'
      : importedTrips.length === 0
        ? 'Import one itinerary or screenshot set so the companion can generate richer day-by-day recaps.'
        : 'Tag your next two entries with place + mood to sharpen future AI reflections.';

  return {
    headline: `${visitedCountryNames.length} countries tracked · ${journalEntries.length} journal entries`,
    coverage: `Recent focus: ${lastCountry}. Imported trip drafts: ${importedTrips.length}.`,
    highlights: latestHighlights.length ? latestHighlights : ['Your next highlight will appear once a new memory is added.'],
    nextFocus,
  };
};

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

export const buildTravelCompanionContext = ({
  journalEntries,
  scrapbookPages,
  importedTrips,
  visitedCountryIds,
}: BuildCompanionContextInput): CompanionTravelContext => {
  const normalizedEntries = journalEntries
    .map(normalizeJournalEntry)
    .sort((first, second) => toTimestamp(second.createdAt) - toTimestamp(first.createdAt));
  const visitedCountryNames = visitedCountryIds.map((countryId) => getCountryName(countryId));
  const passportStamps = buildPassportStamps(visitedCountryIds);
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

export const buildJournalSuggestions = (context: CompanionTravelContext) => {
  const latestEntry = context.journalEntries[0];
  const latestCountry = latestEntry ? getCountryName(latestEntry.countryId) : context.visitedCountryNames[0] || 'your latest stop';
  const secondCountry = context.visitedCountryNames[1] || latestCountry;
  const mood = context.topMoods[0] || 'reflective';

  return [
    `Write a sensory vignette from ${latestCountry} using one smell, one sound, and one surprise.`,
    `Create a then-vs-now reflection between ${latestCountry} and ${secondCountry}.`,
    `Expand your ${mood} thread: what changed in how you moved through the day?`,
  ];
};

export const buildCaptionIdeas = (context: CompanionTravelContext) => {
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

export const buildTravelReflections = (context: CompanionTravelContext): TravelReflection[] => {
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
      id: 'prompt-journal',
      title: 'Journal Draft',
      prompt: `Generate 3 journal follow-up prompts based on "${leadEntry}".`,
      intent: 'journal-suggestions',
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

export const buildMemoryInsights = (context: CompanionTravelContext): MemoryInsight[] => [
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

export const buildCompanionInsights = (context: CompanionTravelContext): CompanionInsightBundle => ({
  prompts: buildSuggestedPrompts(context),
  journalSuggestions: buildJournalSuggestions(context),
  captionIdeas: buildCaptionIdeas(context),
  reflections: buildTravelReflections(context),
  insightCards: buildMemoryInsights(context),
});

const resolveIntent = (message: string): TravelCompanionIntent => {
  const lowerMessage = message.toLowerCase();

  const matchedIntent = (Object.keys(intentKeywords) as TravelCompanionIntent[]).find((intent) => {
    if (intent === 'general') {
      return false;
    }

    return intentKeywords[intent].some((keyword) => lowerMessage.includes(keyword));
  });

  return matchedIntent ?? 'general';
};

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

const formatJournalReply = (context: CompanionTravelContext) =>
  ['Here are fresh journal prompts from your travel archive:', ...buildJournalSuggestions(context).map((item) => `- ${item}`)].join('\n');

const formatReflectionReply = (context: CompanionTravelContext) =>
  buildTravelReflections(context)
    .map((reflection) => `${reflection.title}: ${reflection.reflection} (${reflection.anchor})`)
    .join('\n');

const formatCaptionReply = (context: CompanionTravelContext) =>
  ['Caption ideas pulled from your scrapbook context:', ...buildCaptionIdeas(context).map((caption) => `- ${caption}`)].join('\n');

const formatPersonalityReply = (context: CompanionTravelContext) => {
  const reasons = context.personality.reasons.map((reason) => `- ${reason}`).join('\n');

  return [
    `Travel personality: ${context.personality.label}`,
    context.personality.description,
    reasons,
  ].join('\n');
};

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

const formatGeneralReply = (context: CompanionTravelContext) => {
  const latestMemory = context.memoryPool[0];
  const memoryLine = latestMemory ? `Latest memory anchor: ${latestMemory.title}.` : 'No saved memory yet.';

  return [
    `I am tracking ${context.journalEntries.length} journal entries, ${context.scrapbookPages.length} scrapbook pages, and ${context.passportStamps.length} stamp links.`,
    memoryLine,
    'Try asking for a trip recap, journal prompts, captions, or stamp strategy.',
  ].join('\n');
};

export const buildWelcomeMessage = (context: CompanionTravelContext) => {
  const countries = context.visitedCountryNames.slice(0, 3).join(', ') || 'your next destination';

  return `I have synced with your travel archive: ${context.journalEntries.length} journal entries, ${context.scrapbookPages.length} scrapbook pages, and ${context.importedTrips.length} imported trips. I am ready to help you turn ${countries} into richer stories.`;
};

export const generateCompanionReply = (message: string, context: CompanionTravelContext): CompanionChatMessage => {
  const intent = resolveIntent(message);
  const content =
    intent === 'journal-suggestions'
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

export const buildUserMessage = (text: string): CompanionChatMessage => ({
  id: createCompanionId(),
  role: 'user',
  content: text.trim(),
  createdAt: new Date().toISOString(),
  intent: 'general',
});

export const formatTimestamp = (isoTimestamp: string) => {
  const date = new Date(isoTimestamp);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return dateFormatter.format(date);
};
