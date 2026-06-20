export const memoryKeeperQuickActions = [
  { id: 'fix-grammar', label: 'Fix Grammar' },
  { id: 'make-more-descriptive', label: 'Make More Descriptive' },
  { id: 'write-from-photos', label: 'Write From Photos' },
  { id: 'create-caption', label: 'Create Caption' },
  { id: 'turn-into-journal-entry', label: 'Turn Into Journal Entry' },
  { id: 'summarize-trip', label: 'Summarize Trip' },
] as const;

export type MemoryKeeperQuickAction = (typeof memoryKeeperQuickActions)[number]['id'];

export type MemoryKeeperJournalEntry = {
  title: string;
  content: string;
  dateLabel?: string;
};

export type MemoryKeeperPhoto = {
  alt: string;
  caption?: string;
};

export type MemoryKeeperPassportStamp = {
  countryName: string;
  label?: string;
};

export type MemoryKeeperBoardingPass = {
  label: string;
  route?: string;
};

export type MemoryKeeperItineraryItem = {
  title: string;
  detail?: string;
  dayTitle?: string;
};

export type MemoryKeeperTripContext = {
  tripName: string;
  dateLabel?: string;
  journalEntries: MemoryKeeperJournalEntry[];
  photos: MemoryKeeperPhoto[];
  passportStamps: MemoryKeeperPassportStamp[];
  boardingPasses: MemoryKeeperBoardingPass[];
  itineraryItems: MemoryKeeperItineraryItem[];
  tags: string[];
  summary?: string;
};

export type MemoryKeeperPrompt = {
  id: string;
  title: string;
  body: string;
  action: MemoryKeeperQuickAction;
  source: 'photos' | 'passport' | 'boarding-pass' | 'itinerary' | 'journal' | 'trip';
};

export type MemoryKeeperFact = {
  id: string;
  label: string;
  value: string;
};

const CREATIVE_ACTIONS = new Set<MemoryKeeperQuickAction>(
  memoryKeeperQuickActions.map((action) => action.id)
);

const sentenceEndPattern = /[.!?]$/;
const dayNamePattern = /\b(?:monday|tuesday|wednesday|thursday|thsday|friday|saturday|sunday)\b/i;
const monthDatePattern = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s+\d{4}\b/gi;
const noisyInstructionPattern =
  /\b(?:create a memory keeper feature|add the feature|do not use ai|quick action buttons|please implement|requirements|hard-coded faq|existing project structure|you have a boarding pass|want to create a travel-day entry|want me to help turn|memory prompt|journal entries|photos if available|passport stamps|boarding passes|generate helpful memory prompts|fix grammar|make more descriptive|write from photos|create caption|turn into journal entry|summarize trip)\b/i;

export const isMemoryKeeperCreativeAction = (value: string): value is MemoryKeeperQuickAction =>
  CREATIVE_ACTIONS.has(value as MemoryKeeperQuickAction);

const cleanText = (value: string) => value.replace(/\s+/g, ' ').trim();

const truncateText = (value: string, limit: number) => {
  const cleanValue = cleanText(value);

  if (cleanValue.length <= limit) {
    return cleanValue;
  }

  return `${cleanValue.slice(0, limit - 3).trim()}...`;
};

const ensureSentence = (value: string) => {
  const cleanValue = cleanText(value);

  if (!cleanValue) {
    return '';
  }

  return sentenceEndPattern.test(cleanValue) ? cleanValue : `${cleanValue}.`;
};

const uniqueValues = (items: string[], limit: number) =>
  Array.from(new Set(items.map((item) => cleanText(item)).filter(Boolean))).slice(0, limit);

const isUsefulMemoryText = (value: string) => {
  const cleanValue = cleanText(value);

  return Boolean(cleanValue) && !noisyInstructionPattern.test(cleanValue);
};

const sanitizeMemoryText = (value: string) => {
  const withoutInstructionBlocks = value
    .replace(/create\s+a\s+["“]?memory keeper["”]?\s+feature[\s\S]*?please implement[^.;]*(?:[.;]|$)/gi, ' ')
    .replace(/add\s+the\s+feature\s+with\s+these\s+requirements[\s\S]*?please implement[^.;]*(?:[.;]|$)/gi, ' ')
    .replace(/generate helpful memory prompts such as[\s\S]*?summarizing memories/gi, ' ');

  return withoutInstructionBlocks
    .split(/\n|(?:\s+-\s+)/)
    .map((line) => line.trim())
    .filter((line) => line && !noisyInstructionPattern.test(line))
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

const looksLikeBulkItinerary = (value: string) => {
  const cleanValue = cleanText(value);
  const dayMatches = cleanValue.match(/\bday\s+\d+\b/gi)?.length ?? 0;
  const separatorMatches = cleanValue.match(/\s+-\s+/g)?.length ?? 0;

  return cleanValue.length > 700 || dayMatches > 1 || separatorMatches > 10;
};

export const getMemoryKeeperDisplayTripName = (context: MemoryKeeperTripContext) => {
  const tripName = cleanText(context.tripName || 'This trip')
    .replace(/\s+was\s+a\s+.*$/i, '')
    .replace(/\s+was\s+an?\s+.*$/i, '')
    .replace(/\s+covers\s+.*$/i, '')
    .trim();

  return tripName || 'This trip';
};

export const getMemoryKeeperDisplayDateLabel = (context: MemoryKeeperTripContext) => {
  const dates = uniqueValues(
    context.itineraryItems.flatMap((item) =>
      [item.dayTitle, item.title, item.detail ?? ''].join(' ').match(monthDatePattern) ?? []
    ),
    8
  );

  if (!dates.length) {
    return '';
  }

  if (dates.length === 1) {
    return dates[0];
  }

  return `${dates[0]} - ${dates.at(-1)}`;
};

const getPrimaryPlace = (context: MemoryKeeperTripContext) => {
  if (context.passportStamps[0]?.countryName) {
    return context.passportStamps[0].countryName;
  }

  const cleanTripName = getMemoryKeeperDisplayTripName(context);
  const tripPlace = cleanTripName.match(/\btrip\s+to\s+(.+)$/i)?.[1]?.trim();
  if (tripPlace) {
    return tripPlace;
  }

  if (cleanTripName !== 'This trip' && cleanTripName.length <= 48 && !dayNamePattern.test(cleanTripName)) {
    return cleanTripName.replace(/^trip\s+to\s+/i, '');
  }

  return (
    context.tags.find((tag) => tag.length > 2 && !dayNamePattern.test(tag) && !/^\d+$/.test(tag)) ||
    'this trip'
  );
};

const getTripLabel = (context: MemoryKeeperTripContext) => {
  const tripName = getMemoryKeeperDisplayTripName(context);
  const dateLabel = getMemoryKeeperDisplayDateLabel(context) || context.dateLabel;
  return dateLabel ? `${tripName} (${dateLabel})` : tripName;
};

const getJournalBody = (context: MemoryKeeperTripContext, selectedText?: string) => {
  if (selectedText?.trim()) {
    return sanitizeMemoryText(selectedText);
  }

  return sanitizeMemoryText(
    context.journalEntries
    .map((entry) => entry.content)
    .filter(Boolean)
    .join('\n\n')
    .trim()
  );
};

const getPhotoDetails = (context: MemoryKeeperTripContext) =>
  context.photos
    .slice(0, 6)
    .map((photo) => photo.caption || photo.alt)
    .filter(isUsefulMemoryText);

const describeItineraryItem = (item: MemoryKeeperItineraryItem) => {
  const title = cleanText(item.title);
  const detail = cleanText(item.detail ?? '');
  const dayTitle = cleanText(item.dayTitle ?? '');
  const parts = [dayTitle, title, detail].filter((part, index, items) => {
    if (!part || noisyInstructionPattern.test(part)) {
      return false;
    }

    return items.findIndex((candidate) => candidate.toLowerCase() === part.toLowerCase()) === index;
  });

  return parts.join(' - ');
};

const getItineraryDetails = (context: MemoryKeeperTripContext) =>
  uniqueValues(context.itineraryItems.map(describeItineraryItem).filter(isUsefulMemoryText), 8);

const splitItineraryHighlights = (context: MemoryKeeperTripContext) => {
  const candidates = context.itineraryItems.flatMap((item) =>
    [item.title, item.detail ?? '']
      .join(' - ')
      .split(/\s+-\s+|\n|;/)
      .map((part) => part.trim())
  );

  return uniqueValues(
    candidates.filter((candidate) => {
      const cleanCandidate = cleanText(candidate);

      return (
        cleanCandidate.length >= 4 &&
        cleanCandidate.length <= 70 &&
        !/^day\s+\d+\b/i.test(cleanCandidate) &&
        !/^\d{1,2}:\d{2}\s*(?:am|pm)?$/i.test(cleanCandidate) &&
        !dayNamePattern.test(cleanCandidate) &&
        isUsefulMemoryText(cleanCandidate)
      );
    }),
    8
  );
};

const getItineraryDayCount = (context: MemoryKeeperTripContext) => {
  const dayLabels = context.itineraryItems
    .map((item) => item.dayTitle || item.title.match(/^day\s+\d+/i)?.[0] || '')
    .map((label) => label.match(/^day\s+(\d+)/i)?.[1] ? `day-${label.match(/^day\s+(\d+)/i)?.[1]}` : label)
    .map((label) => label.toLowerCase().trim())
    .filter(Boolean);

  return new Set(dayLabels).size;
};

const formatList = (items: string[]) => {
  if (items.length <= 1) {
    return items[0] || '';
  }

  try {
    return new Intl.ListFormat('en', { style: 'long', type: 'conjunction' }).format(items);
  } catch {
    return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
  }
};

const buildTripSummaryTemplate = (context: MemoryKeeperTripContext) => {
  const tripName = getMemoryKeeperDisplayTripName(context);
  const place = getPrimaryPlace(context);
  const dateLabel = getMemoryKeeperDisplayDateLabel(context) || context.dateLabel;
  const dayCount = getItineraryDayCount(context);
  const highlights = splitItineraryHighlights(context);
  const photoDetails = getPhotoDetails(context);
  const hasJournal = context.journalEntries.length > 0;
  const travelPieces = [
    context.photos.length ? `${context.photos.length} photo${context.photos.length === 1 ? '' : 's'}` : '',
    context.passportStamps.length ? `${context.passportStamps.length} passport stamp${context.passportStamps.length === 1 ? '' : 's'}` : '',
    context.boardingPasses.length ? `${context.boardingPasses.length} travel-day clue${context.boardingPasses.length === 1 ? '' : 's'}` : '',
  ].filter(Boolean);

  return [
    `${tripName}${dateLabel ? ` (${dateLabel})` : ''} covers ${
      dayCount ? `${dayCount} itinerary day${dayCount === 1 ? '' : 's'}` : 'a saved travel memory'
    }${place === 'this trip' ? '' : ` in ${place}`}.`,
    highlights.length ? `Key moments: ${formatList(highlights.slice(0, 5))}.` : '',
    photoDetails.length ? `Photo thread: ${formatList(photoDetails.slice(0, 3))}.` : '',
    travelPieces.length ? `Saved clues: ${formatList(travelPieces)}${hasJournal ? ' plus a journal draft' : ''}.` : hasJournal ? 'Saved clues: a journal draft.' : '',
    'Best next step: choose one favorite moment and turn it into a short reflective journal entry.',
  ]
    .filter(Boolean)
    .join('\n')
    .trim();
};

const buildDescriptiveMemoryTemplate = (context: MemoryKeeperTripContext, place: string, journalBody: string) => {
  const highlights = splitItineraryHighlights(context);
  const photos = getPhotoDetails(context);
  const cleanJournalBody = looksLikeBulkItinerary(journalBody) ? '' : journalBody;

  if (cleanJournalBody) {
    return `${ensureSentence(cleanJournalBody)} I want to remember the smaller details too: the light, the sounds, the pace of the day, and the moment that made ${place} feel real.`;
  }

  if (highlights.length) {
    const highlightList = formatList(highlights.slice(0, 4));
    const photoLine = photos.length ? ` The photos hold onto ${formatList(photos.slice(0, 2))}.` : '';

    return `In ${place}, this memory feels full of movement: ${highlightList}.${photoLine} I want to remember the texture of the day, the little pauses between stops, and the moment that made the trip feel personal.`;
  }

  return `In ${place}, the memory I want to keep is the texture of the day: what I saw first, what surprised me, and the feeling I carried back with me.`;
};

const buildCaptionTemplate = (context: MemoryKeeperTripContext, place: string, journalBody: string) => {
  const photos = getPhotoDetails(context);
  const highlights = splitItineraryHighlights(context);
  const cleanJournalBody = looksLikeBulkItinerary(journalBody) ? '' : journalBody;
  const journalSeed = cleanJournalBody ? truncateText(cleanJournalBody, 80) : '';

  if (photos.length) {
    return [
      `${place} in one frame: ${truncateText(photos[0], 72)}`,
      photos[1] ? `A little piece of ${place}: ${truncateText(photos[1], 72)}` : '',
      `Saved from ${getTripLabel(context)}.`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  if (highlights.length) {
    const firstHighlight = highlights[0];
    const secondHighlight = highlights[1];

    return [
      `${firstHighlight}, and the kind of day I wanted to keep.`,
      secondHighlight ? `${place} between ${firstHighlight} and ${secondHighlight}.` : `${place}, remembered through ${firstHighlight}.`,
      `A small chapter from ${getTripLabel(context)}.`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  if (journalSeed) {
    return `${place}, remembered through this moment: ${journalSeed}`;
  }

  return `${place}, kept as a quiet travel memory.`;
};

export const buildMemoryKeeperFacts = (context: MemoryKeeperTripContext): MemoryKeeperFact[] => {
  const facts: MemoryKeeperFact[] = [
    {
      id: 'journal',
      label: 'Story',
      value: context.journalEntries.length ? `${context.journalEntries.length} draft source` : 'Missing',
    },
  ];

  if (context.photos.length) {
    facts.push({
      id: 'photos',
      label: 'Photos',
      value: String(context.photos.length),
    });
  }

  if (context.passportStamps.length) {
    facts.push({
      id: 'stamps',
      label: 'Stamps',
      value: String(context.passportStamps.length),
    });
  }

  if (context.boardingPasses.length) {
    facts.push({
      id: 'boarding',
      label: 'Travel days',
      value: String(context.boardingPasses.length),
    });
  }

  if (context.itineraryItems.length) {
    facts.push({
      id: 'itinerary',
      label: 'Itinerary',
      value: String(context.itineraryItems.length),
    });
  }

  return facts.slice(0, 5);
};

export const buildMemoryKeeperPrompts = (context: MemoryKeeperTripContext): MemoryKeeperPrompt[] => {
  const prompts: MemoryKeeperPrompt[] = [];
  const firstStamp = context.passportStamps[0];
  const firstBoardingPass = context.boardingPasses[0];
  const firstItineraryItem = context.itineraryItems[0];

  if (context.photos.length) {
    prompts.push({
      id: 'photos-to-memory',
      title: 'Photos waiting for a story',
      body: 'You added photos from this day. Want to write a memory about them?',
      action: 'write-from-photos',
      source: 'photos',
    });
  }

  if (firstStamp) {
    prompts.push({
      id: 'passport-stamp-memory',
      title: 'Passport stamp moment',
      body: `You collected a passport stamp for ${firstStamp.countryName}. What was your favorite moment there?`,
      action: 'turn-into-journal-entry',
      source: 'passport',
    });
  }

  if (firstBoardingPass) {
    prompts.push({
      id: 'boarding-pass-travel-day',
      title: 'Travel day',
      body: `You have a boarding pass from ${firstBoardingPass.route || firstBoardingPass.label}. Want to create a travel-day entry?`,
      action: 'turn-into-journal-entry',
      source: 'boarding-pass',
    });
  }

  if (!context.journalEntries.length && (context.dateLabel || context.tripName)) {
    prompts.push({
      id: 'missing-journal-entry',
      title: 'A blank page',
      body: 'You have not written a journal entry for this day yet.',
      action: 'turn-into-journal-entry',
      source: 'journal',
    });
  }

  if (firstItineraryItem) {
    prompts.push({
      id: 'itinerary-to-entry',
      title: truncateText(firstItineraryItem.title, 44),
      body: 'Want me to help turn this itinerary item into a journal entry?',
      action: 'turn-into-journal-entry',
      source: 'itinerary',
    });
  }

  if (!prompts.length) {
    prompts.push({
      id: 'reflective-trip-prompt',
      title: 'Memory seed',
      body: `Want a reflective prompt for ${context.tripName || 'this trip'}?`,
      action: 'turn-into-journal-entry',
      source: 'trip',
    });
  }

  return prompts.slice(0, 5);
};

export const inferMemoryKeeperAction = (message: string): MemoryKeeperQuickAction => {
  const query = message.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

  if (/\b(grammar|grammer|spell|spelling|punctuation|proofread|proof read|fix)\b/.test(query)) {
    return 'fix-grammar';
  }

  if (/\b(caption|instagram|title)\b/.test(query)) {
    return 'create-caption';
  }

  if (/\b(photo|photos|picture|pictures|image|images)\b/.test(query)) {
    return 'write-from-photos';
  }

  if (/\b(summary|summarize|summarise|recap|wrap up)\b/.test(query)) {
    return 'summarize-trip';
  }

  if (/\b(descriptive|describe|expand|longer|detail|details|richer|emotional)\b/.test(query)) {
    return 'make-more-descriptive';
  }

  return 'turn-into-journal-entry';
};

export const buildMemoryKeeperPromptSeed = (
  prompt: MemoryKeeperPrompt,
  context: MemoryKeeperTripContext,
  draftText?: string
) => {
  const photos = getPhotoDetails(context);
  const itinerary = getItineraryDetails(context);
  const firstStamp = context.passportStamps[0];
  const firstBoardingPass = context.boardingPasses[0];
  const lines = [`Memory prompt: ${prompt.body}`];

  if (prompt.source === 'photos' && photos.length) {
    lines.push(`Photo clues: ${photos.join('; ')}`);
  }

  if (prompt.source === 'passport' && firstStamp) {
    lines.push(`Passport stamp: ${firstStamp.countryName}${firstStamp.label ? ` (${firstStamp.label})` : ''}`);
  }

  if (prompt.source === 'boarding-pass' && firstBoardingPass) {
    lines.push(`Travel-day clue: ${firstBoardingPass.route || firstBoardingPass.label}`);
  }

  if (prompt.source === 'itinerary' && itinerary.length) {
    lines.push(`Itinerary clues: ${itinerary.slice(0, 4).join('; ')}`);
  }

  if (prompt.source === 'journal' && draftText?.trim()) {
    lines.push(`Existing story: ${truncateText(draftText, 800)}`);
  }

  if (context.summary) {
    lines.push(`Trip summary: ${truncateText(context.summary, 500)}`);
  }

  return lines.join('\n');
};

export const getMemoryKeeperFaqResponse = (question: string) => {
  const query = question.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

  if (!query) {
    return null;
  }

  const asksHow = /\b(how|where|can|what)\b/.test(query);

  if (asksHow && /\b(passport|stamp|stamps)\b/.test(query)) {
    return 'Open Passport, choose the country stamp you want to keep, then save it to your passport. When a trip import finds the same country, Memory Keeper can use that stamp as a memory prompt.';
  }

  if (asksHow && /\b(photo|photos|picture|pictures|image|images)\b/.test(query)) {
    return 'Use the photo tray or image button on the journal page to add trip photos. Once photos are on a page, Memory Keeper can help turn them into captions or a short memory.';
  }

  if (asksHow && /\b(import|itinerary|trip)\b/.test(query)) {
    return 'Use Import Trip in the Canva workspace, add itinerary text or travel files, then review the draft before saving it as a journal entry.';
  }

  if (asksHow && /\b(save|journal|entry|draft)\b/.test(query)) {
    return 'Fill in the journal name, country, dates, and story, then use Save Entry. If Memory Keeper writes something useful, use it as a starting draft before saving.';
  }

  return null;
};

export const createMemoryKeeperTemplate = (
  action: MemoryKeeperQuickAction,
  context: MemoryKeeperTripContext,
  selectedText?: string
) => {
  const tripLabel = getTripLabel(context);
  const place = getPrimaryPlace(context);
  const journalBody = getJournalBody(context, selectedText);
  const photos = getPhotoDetails(context);
  const itinerary = getItineraryDetails(context);
  const summary = context.summary ? ensureSentence(sanitizeMemoryText(context.summary)) : '';

  switch (action) {
    case 'fix-grammar':
      return journalBody
        ? journalBody
            .replace(/\bi\b/g, 'I')
            .replace(/\bdidnt\b/gi, "didn't")
            .replace(/\bcant\b/gi, "can't")
            .replace(/\bwont\b/gi, "won't")
            .replace(/\s{2,}/g, ' ')
            .trim()
        : `I want to remember ${tripLabel} with clear details about where I went, what I noticed, and how it felt.`;
    case 'make-more-descriptive':
      return buildDescriptiveMemoryTemplate(context, place, journalBody);
    case 'write-from-photos':
      return photos.length
        ? `Photo memory from ${tripLabel}: ${photos.map((photo) => ensureSentence(photo)).join(' ')} Looking back, these photos feel like pieces of one day worth keeping.`
        : `Photo memory from ${tripLabel}: I want to write about what these images made me notice, what happened just before the photo, and why I kept it.`;
    case 'create-caption':
      return buildCaptionTemplate(context, place, journalBody);
    case 'turn-into-journal-entry':
      if (journalBody && selectedText?.trim()) {
        return [
          `${context.tripName || 'Trip'} Journal Entry`,
          '',
          ensureSentence(summary || `This memory belongs to ${tripLabel}`),
          ensureSentence(journalBody),
          photos.length ? `Photo details to include: ${photos.slice(0, 3).join('; ')}.` : '',
          itinerary.length ? `Trip details to include: ${itinerary.slice(0, 3).join('; ')}.` : '',
        ]
          .filter(Boolean)
          .join('\n')
          .trim();
      }

      if (itinerary.length) {
        return [`${context.tripName || 'Trip'} Journal Entry`, '', summary, ...itinerary.map((item) => `I want to remember ${ensureSentence(item)}`)]
          .filter(Boolean)
          .join('\n')
          .trim();
      }

      return [
        `${context.tripName || 'Trip'} Journal Entry`,
        '',
        summary || `Today in ${place}, I want to remember what made the day feel different from ordinary life.`,
        journalBody ? `Notes I started from: ${journalBody}` : 'The moment I would write first is the one I keep replaying in my mind.',
      ]
        .filter(Boolean)
        .join('\n')
        .trim();
    case 'summarize-trip':
      return buildTripSummaryTemplate(context);
    default:
      return `A memory prompt for ${tripLabel}: What is one small detail from this trip that you do not want to forget?`;
  }
};

export const buildMemoryKeeperPromptInput = (
  action: MemoryKeeperQuickAction,
  context: MemoryKeeperTripContext,
  selectedText?: string
) => {
  const safeContext = {
    tripName: context.tripName,
    dateLabel: context.dateLabel,
    summary: context.summary ? truncateText(sanitizeMemoryText(context.summary), 700) : undefined,
    tags: context.tags.slice(0, 8),
    journalEntries: context.journalEntries.slice(0, 4).map((entry) => ({
      title: entry.title,
      dateLabel: entry.dateLabel,
      content: truncateText(entry.content, 1400),
    })),
    photos: context.photos.slice(0, 8),
    passportStamps: context.passportStamps.slice(0, 6),
    boardingPasses: context.boardingPasses.slice(0, 4),
    itineraryItems: context.itineraryItems.slice(0, 10),
  };

  return [
    `Creative action: ${action}`,
    selectedText?.trim()
      ? `Selected draft text:\n${truncateText(sanitizeMemoryText(selectedText), action === 'summarize-trip' ? 700 : 1800)}`
      : '',
    `Trip context:\n${JSON.stringify(safeContext, null, 2)}`,
  ]
    .filter(Boolean)
    .join('\n\n');
};
