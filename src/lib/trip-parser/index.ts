// Local itinerary parser for imported travel plans.
// This parser turns pasted text, screenshots, PDFs, and Wanderlog-style copies
// into the structured draft shape used by journal import and AI memory flows.
import { COUNTRY_STAMPS } from '@/data/stamps/countries';
import { placeholderCountries } from '@/lib/placeholderData';
import { normalizeCountryToStampId } from '@/lib/stamps/assets';
import type {
  ParsedTripActivity,
  ParsedTripDay,
  ParsedTripDraft,
  ParsedTripLocation,
  ParsedTripSourceSignal,
  TripImportFile,
} from '@/types/trips';

export type TripParserInput = {
  text?: string;
  files?: TripImportFile[];
  now?: Date;
};

type DateSignal = {
  iso?: string;
  endIso?: string;
  originalText: string;
  label: string;
  dayNumber?: number;
};

type SourceLine = {
  line: string;
  kind: ParsedTripActivity['sourceKind'];
};

type PlaceAlias = {
  alias: string;
  name: string;
  countryId?: string;
  countryName?: string;
  stampId?: string;
  weight: number;
};

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const MONTH_PATTERN = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join('|');

// Extra aliases cover common cities and country nicknames that are not present
// in the placeholder country seed data.
const EXTRA_PLACE_ALIASES: PlaceAlias[] = [
  { alias: 'nyc', name: 'New York', countryId: 'US', countryName: 'United States', weight: 9 },
  { alias: 'new york city', name: 'New York', countryId: 'US', countryName: 'United States', weight: 10 },
  { alias: 'san francisco', name: 'San Francisco', countryId: 'US', countryName: 'United States', weight: 10 },
  { alias: 'sf', name: 'San Francisco', countryId: 'US', countryName: 'United States', weight: 7 },
  { alias: 'usa', name: 'United States', countryId: 'US', countryName: 'United States', weight: 9 },
  { alias: 'u.s.a.', name: 'United States', countryId: 'US', countryName: 'United States', weight: 9 },
  { alias: 'paris', name: 'Paris', countryId: 'FR', countryName: 'France', weight: 10 },
  { alias: 'tokyo', name: 'Tokyo', countryId: 'JP', countryName: 'Japan', weight: 10 },
  { alias: 'kyoto', name: 'Kyoto', countryId: 'JP', countryName: 'Japan', weight: 10 },
  { alias: 'rome', name: 'Rome', countryId: 'IT', countryName: 'Italy', weight: 10 },
  { alias: 'venice', name: 'Venice', countryId: 'IT', countryName: 'Italy', weight: 10 },
  { alias: 'rio de janeiro', name: 'Rio de Janeiro', countryId: 'BR', countryName: 'Brazil', weight: 10 },
  { alias: 'sao paulo', name: 'Sao Paulo', countryId: 'BR', countryName: 'Brazil', weight: 10 },
  { alias: 'sydney', name: 'Sydney', countryId: 'AU', countryName: 'Australia', weight: 10 },
  { alias: 'melbourne', name: 'Melbourne', countryId: 'AU', countryName: 'Australia', weight: 10 },
  { alias: 'toronto', name: 'Toronto', countryName: 'Canada', stampId: 'canada', weight: 10 },
  { alias: 'vancouver', name: 'Vancouver', countryName: 'Canada', stampId: 'canada', weight: 10 },
  { alias: 'mexico city', name: 'Mexico City', countryName: 'Mexico', stampId: 'mexico', weight: 10 },
  { alias: 'cairo', name: 'Cairo', countryName: 'Egypt', stampId: 'egypt', weight: 10 },
  { alias: 'bangkok', name: 'Bangkok', countryName: 'Thailand', stampId: 'thailand', weight: 10 },
  { alias: 'athens', name: 'Athens', countryName: 'Greece', stampId: 'greece', weight: 10 },
  { alias: 'reykjavik', name: 'Reykjavik', countryName: 'Iceland', stampId: 'iceland', weight: 10 },
  { alias: 'seoul', name: 'Seoul', countryName: 'South Korea', weight: 10 },
  { alias: 'suwon', name: 'Suwon', countryName: 'South Korea', weight: 8 },
];

// Activity keywords and cleanup patterns help distinguish real itinerary items
// from copied UI chrome, addresses, map links, and raw travel-distance rows.
const ACTIVITY_KEYWORDS = [
  'arrival',
  'beach',
  'breakfast',
  'check-in',
  'dinner',
  'flight',
  'hike',
  'hotel',
  'lunch',
  'market',
  'museum',
  'reservation',
  'temple',
  'tour',
  'train',
  'walk',
];

const WEEKDAY_PATTERN =
  'mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?';

const SECTION_HEADER_PATTERN =
  /^(?:activity|activities|afternoon|arrival|bookings?|calendar|day plan|details?|dining|evening|flights?|food|hotels?|ideas?|itinerary|lodging|map|morning|night|notes?|overview|places|places to (?:go|see|visit)|reservations?|restaurants?|schedule|things to do|timeline|todo|transportation|travel|trip overview|where to stay)$/i;

const LOW_SIGNAL_LINE_PATTERN =
  /^(?:\(?[\d,.km]+\)?|[\d.]+\s*(?:\([\d,.km]+\))?|[\d$€£¥,.]+\s*(?:per person|total)?|https?:\/\/\S+|www\.\S+|open in maps?|view details?|see more|read more|add note|directions?)$/i;

const ADDRESS_OR_HOURS_PATTERN =
  /^(?:\d+\s+[A-Za-z].*\b(?:ave|avenue|blvd|boulevard|drive|dr|lane|ln|place|pl|road|rd|rue|street|st|way)\b|(?:closed|closes|hours|open|opens)\b.*)$/i;

const WANDERLOG_TRAVEL_LINE_PATTERN =
  /^(?:<\s*)?\d+\s*(?:hr|hrs|hour|hours|min|mins|minute|minutes)\b.*(?:·|,)\s*\d+(?:\.\d+)?\s*(?:ft|m|mi|mile|miles|km|kilometer|kilometers)\b/i;

const WANDERLOG_DATE_TIME_ONLY_PATTERN =
  new RegExp(`^(?:${MONTH_PATTERN})\\.?\\s+\\d{1,2}\\s+\\d{1,2}(?::\\d{2})?\\s*(?:am|pm)$`, 'i');

const ACTIVITY_PLACE_HINT_PATTERN =
  /\b(?:airport|bar|beach|cafe|cathedral|center|centre|garden|gallery|hotel|market|museum|palace|park|plaza|restaurant|station|temple|tower|trail|tour)\b/i;

const GENERIC_LOCATION_STOP_WORDS = new Set([
  'Activity',
  'Add',
  'Arrive',
  'Arrival',
  'Breakfast',
  'Calendar',
  'Check',
  'Day',
  'Depart',
  'Departure',
  'Details',
  'Dinner',
  'Drive',
  'Evening',
  'Flight',
  'Flights',
  'Hotel',
  'Itinerary',
  'Lunch',
  'Map',
  'Morning',
  'Night',
  'Note',
  'Notes',
  'Reservation',
  'Reservations',
  'Restaurant',
  'Restaurants',
  'Schedule',
  'Screenshot',
  'Train',
  'Trip',
  'Visit',
  'Walk',
  'Wanderlog',
]);

const availableStampIds = new Set(COUNTRY_STAMPS.map((stamp) => stamp.id));

// Parser ids are client-safe and do not need database stability; they only need
// to be unique enough for React keys and draft editing.
const createParserId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Small text cleanup helpers normalize imported content before regex parsing.
const titleCase = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');

const stripFileExtension = (fileName: string) => fileName.replace(/\.[^/.]+$/, '');

const cleanFileName = (fileName: string) =>
  stripFileExtension(fileName)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeLine = (line: string) =>
  line
    .replace(/[\u2022*]+/g, ' ')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

// Creates a validated ISO date. Invalid dates like February 31 return undefined
// instead of rolling forward.
const toIsoDate = (year: number, month: number, day: number) => {
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }

  return date.toISOString().slice(0, 10);
};

// Two-digit years are mapped near the present because imported itineraries are
// overwhelmingly current/future travel documents.
const normalizeYear = (yearText: string | undefined, fallbackYear: number) => {
  if (!yearText) {
    return fallbackYear;
  }

  const year = Number(yearText);

  if (yearText.length === 2) {
    return year >= 70 ? 1900 + year : 2000 + year;
  }

  return year;
};

const formatIsoDate = (isoDate: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${isoDate}T00:00:00Z`));

// Extracts date/day signals from many common itinerary formats. The parser uses
// these signals to decide when to start a new timeline day.
const parseDateSignal = (line: string, fallbackYear: number): DateSignal | null => {
  const dayMatch = line.match(/\bday\s+(\d{1,2})\b/i);

  if (dayMatch) {
    return {
      originalText: dayMatch[0],
      label: `Day ${dayMatch[1]}`,
      dayNumber: Number(dayMatch[1]),
    };
  }

  const isoMatch = line.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/);

  if (isoMatch) {
    const iso = toIsoDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));

    return {
      iso,
      originalText: isoMatch[0],
      label: iso ? formatIsoDate(iso) : isoMatch[0],
    };
  }

  const monthRangeMatch = line.match(
    new RegExp(`\\b(${MONTH_PATTERN})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:-|to|through)\\s*(?:(${MONTH_PATTERN})\\.?\\s+)?(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{2,4}))?`, 'i')
  );

  if (monthRangeMatch) {
    const startMonthKey = monthRangeMatch[1].toLowerCase().replace('.', '');
    const endMonthKey = (monthRangeMatch[3] || monthRangeMatch[1]).toLowerCase().replace('.', '');
    const startMonth = MONTHS[startMonthKey];
    const endMonth = MONTHS[endMonthKey];
    const year = normalizeYear(monthRangeMatch[5], fallbackYear);
    const iso = toIsoDate(year, startMonth, Number(monthRangeMatch[2]));
    const endIso = toIsoDate(year, endMonth, Number(monthRangeMatch[4]));

    return {
      iso,
      endIso,
      originalText: monthRangeMatch[0],
      label:
        iso && endIso
          ? `${formatIsoDate(iso)} - ${formatIsoDate(endIso)}`
          : monthRangeMatch[0],
    };
  }

  const monthMatch = line.match(
    new RegExp(`\\b(?:${WEEKDAY_PATTERN})?,?\\s*(${MONTH_PATTERN})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{2,4}))?`, 'i')
  );

  if (monthMatch) {
    const monthKey = monthMatch[1].toLowerCase().replace('.', '');
    const month = MONTHS[monthKey];
    const year = normalizeYear(monthMatch[3], fallbackYear);
    const iso = toIsoDate(year, month, Number(monthMatch[2]));

    return {
      iso,
      originalText: monthMatch[0],
      label: iso ? formatIsoDate(iso) : monthMatch[0],
    };
  }

  const numericRangeMatch = line.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\s*(?:-|to|through)\s*(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/i);

  if (numericRangeMatch) {
    const startYear = normalizeYear(numericRangeMatch[3], fallbackYear);
    const endYear = normalizeYear(numericRangeMatch[6], startYear);
    const iso = toIsoDate(startYear, Number(numericRangeMatch[1]), Number(numericRangeMatch[2]));
    const endIso = toIsoDate(endYear, Number(numericRangeMatch[4]), Number(numericRangeMatch[5]));

    return {
      iso,
      endIso,
      originalText: numericRangeMatch[0],
      label:
        iso && endIso
          ? `${formatIsoDate(iso)} - ${formatIsoDate(endIso)}`
          : numericRangeMatch[0],
    };
  }

  const numericMatch = line.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);

  if (numericMatch) {
    const year = normalizeYear(numericMatch[3], fallbackYear);
    const iso = toIsoDate(year, Number(numericMatch[1]), Number(numericMatch[2]));

    return {
      iso,
      originalText: numericMatch[0],
      label: iso ? formatIsoDate(iso) : numericMatch[0],
    };
  }

  const weekdayMatch = line.match(new RegExp(`^\\s*(${WEEKDAY_PATTERN})\\s*$`, 'i'));

  if (weekdayMatch) {
    return {
      originalText: weekdayMatch[0],
      label: titleCase(weekdayMatch[0]),
    };
  }

  return null;
};

// Pulls a time label from an activity line without trying to fully model time
// zones or calendar events.
const extractTime = (line: string) => {
  const timeMatch = line.match(
    /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b|\b([01]?\d|2[0-3]):([0-5]\d)\b/i
  );

  if (!timeMatch) {
    return undefined;
  }

  return timeMatch[0].toUpperCase();
};

// Detects lines that are only a time marker so the next place/activity can
// inherit that time in copied itinerary formats.
const isTimeOnlyLine = (line: string) => {
  const time = extractTime(line);

  if (!time) {
    return false;
  }

  return normalizeLine(line).toLowerCase().replace(time.toLowerCase(), '').replace(/[:|-]/g, '').trim().length === 0;
};

// Wanderlog exports often include stop numbers as separate lines; those should
// steer parsing but never become activities.
const isStandaloneStopNumber = (line: string) => /^\d{1,3}$/.test(line.trim());

const hasLetters = (line: string) => /[^\W\d_]/u.test(line);

const isWanderlogTravelLine = (line: string) => WANDERLOG_TRAVEL_LINE_PATTERN.test(line);

// Identifies combined date/time rows from Wanderlog so they do not become
// duplicate timeline activities.
const isWanderlogDateTimeOnlyLine = (line: string) => {
  if (WANDERLOG_DATE_TIME_ONLY_PATTERN.test(line)) {
    return true;
  }

  const time = extractTime(line);
  const dateSignal = parseDateSignal(line, new Date().getFullYear());

  if (!time || !dateSignal?.originalText) {
    return false;
  }

  return normalizeLine(line)
    .replace(dateSignal.originalText, '')
    .replace(time, '')
    .replace(/[:|-]/g, '')
    .trim().length === 0;
};

// Removes leading schedule text from Wanderlog place rows before location
// matching runs.
const cleanWanderlogPlaceLine = (line: string) =>
  line
    .replace(new RegExp(`^(?:${MONTH_PATTERN})\\.?\\s+\\d{1,2}\\s+\\d{1,2}(?::\\d{2})?\\s*(?:am|pm)\\s+`, 'i'), '')
    .replace(/^\d{1,2}(?::\d{2})?\s*(?:am|pm)\s+/i, '')
    .replace(/^to\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();

// Builds a weighted place dictionary from seeded countries, stamp metadata, and
// hand-authored aliases. Longer aliases are sorted first to avoid partial hits.
const buildPlaceAliases = (): PlaceAlias[] => {
  const aliases: PlaceAlias[] = [];

  placeholderCountries.forEach((country) => {
    const normalizedStampId = normalizeCountryToStampId(country.name);
    const stampId = availableStampIds.has(normalizedStampId) ? normalizedStampId : undefined;

    aliases.push({
      alias: country.name,
      name: country.name,
      countryId: country.id,
      countryName: country.name,
      stampId,
      weight: 9,
    });

    country.cities?.forEach((city) => {
      aliases.push({
        alias: city.name,
        name: city.name,
        countryId: country.id,
        countryName: country.name,
        stampId,
        weight: 10,
      });
    });
  });

  COUNTRY_STAMPS.forEach((stamp) => {
    aliases.push({
      alias: stamp.country_name,
      name: stamp.country_name,
      countryName: stamp.country_name,
      stampId: stamp.id,
      weight: 8,
    });
  });

  aliases.push(...EXTRA_PLACE_ALIASES);

  const seen = new Set<string>();

  return aliases
    .map((place) => ({
      ...place,
      alias: place.alias.trim().toLowerCase(),
    }))
    .filter((place) => {
      const key = `${place.alias}:${place.name}:${place.countryId || place.countryName || ''}`;

      if (!place.alias || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .sort((first, second) => second.alias.length - first.alias.length || second.weight - first.weight);
};

const PLACE_ALIASES = buildPlaceAliases();

// Generic title-case candidates catch places that are not in the known alias
// list while filtering out headings and low-signal copied text.
const isGenericLocationCandidate = (candidate: string) => {
  const cleanCandidate = candidate
    .replace(/[()[\]{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (
    cleanCandidate.length < 3 ||
    cleanCandidate.length > 52 ||
    /\d/.test(cleanCandidate) ||
    LOW_SIGNAL_LINE_PATTERN.test(cleanCandidate) ||
    SECTION_HEADER_PATTERN.test(cleanCandidate)
  ) {
    return false;
  }

  const words = cleanCandidate.split(/\s+/);

  if (words.some((word) => GENERIC_LOCATION_STOP_WORDS.has(word.replace(/[:,-]/g, '')))) {
    return false;
  }

  return words.some((word) => /^[A-Z][A-Za-z.'-]{2,}$/.test(word));
};

// Finds generic location-looking phrases in text using conservative patterns.
const getGenericLocationCandidates = (text: string) => {
  const candidates = new Set<string>();
  const cleanText = normalizeLine(text);
  const patterns = [
    /\b(?:around|at|from|in|near|to)\s+([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,3})/g,
    /(?:^|[:,-]\s*)([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,3})(?:,|\s*$)/g,
  ];

  patterns.forEach((pattern) => {
    Array.from(cleanText.matchAll(pattern)).forEach((match) => {
      const candidate = match[1]?.replace(/\b(?:at|from|in|near|to)$/i, '').trim();

      if (candidate && isGenericLocationCandidate(candidate)) {
        candidates.add(candidate);
      }
    });
  });

  return Array.from(candidates);
};

// Combines known alias matching with generic location extraction for a single
// line or text block.
const findLocationsInText = (text: string): ParsedTripLocation[] => {
  const found = new Map<string, ParsedTripLocation>();

  PLACE_ALIASES.forEach((place) => {
    const regex = new RegExp(`(^|[^a-z0-9])${escapeRegExp(place.alias)}([^a-z0-9]|$)`, 'i');

    if (!regex.test(text)) {
      return;
    }

    const key = `${place.name}:${place.countryId || place.countryName || ''}`;

    if (found.has(key)) {
      return;
    }

    found.set(key, {
      id: createParserId('location'),
      name: place.name,
      countryId: place.countryId,
      countryName: place.countryName,
      stampId: place.stampId,
      confidence: Math.min(96, 58 + place.weight * 4),
      matchedText: place.alias,
    });
  });

  getGenericLocationCandidates(text).forEach((candidate) => {
    const duplicatesKnownLocation = Array.from(found.values()).some(
      (location) => location.name.toLowerCase() === candidate.toLowerCase()
    );

    if (duplicatesKnownLocation) {
      return;
    }

    found.set(`generic:${candidate}`, {
      id: createParserId('location'),
      name: candidate,
      confidence: 48,
      matchedText: candidate,
    });
  });

  return Array.from(found.values());
};

// Strips dates, times, bullets, and numbering so saved activities read like
// human labels instead of copied itinerary rows.
const cleanActivityTitle = (line: string, dateSignal: DateSignal | null) => {
  let title = normalizeLine(line)
    .replace(/^[-\d.)\s]+/, '')
    .replace(/\bday\s+\d{1,2}\b/gi, '')
    .trim();

  if (dateSignal?.originalText) {
    title = title.replace(dateSignal.originalText, '').trim();
  }

  title = title
    .replace(/^\s*[:|,-]+\s*/, '')
    .replace(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/gi, '')
    .replace(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return title;
};

// Avoids creating an activity when a line is only a location name already
// captured by the parser.
const isLocationOnly = (title: string, locations: ParsedTripLocation[]) => {
  const normalizedTitle = title.toLowerCase();

  if (ACTIVITY_PLACE_HINT_PATTERN.test(title)) {
    return false;
  }

  return locations.some(
    (location) =>
      normalizedTitle === location.name.toLowerCase() &&
      Boolean(location.countryId || location.countryName || location.stampId)
  );
};

// Wanderlog copies have repeated stop numbers plus travel-time rows; this shape
// triggers a specialized parser.
const isLikelyWanderlogCopy = (lines: string[]) => {
  const stopNumberCount = lines.filter(isStandaloneStopNumber).length;
  const travelLineCount = lines.filter(isWanderlogTravelLine).length;

  return travelLineCount >= 2 && stopNumberCount >= 2;
};

// Validates candidate place lines from a Wanderlog copy and rejects map chrome,
// addresses, time rows, and paragraph-like descriptions.
const isWanderlogPlaceNameLine = (line: string) => {
  const cleanLine = cleanWanderlogPlaceLine(line);

  if (
    !hasLetters(cleanLine) ||
    cleanLine.length < 2 ||
    cleanLine.length > 120 ||
    isStandaloneStopNumber(cleanLine) ||
    isWanderlogTravelLine(cleanLine) ||
    isWanderlogDateTimeOnlyLine(cleanLine) ||
    isTimeOnlyLine(cleanLine) ||
    LOW_SIGNAL_LINE_PATTERN.test(cleanLine) ||
    ADDRESS_OR_HOURS_PATTERN.test(cleanLine) ||
    SECTION_HEADER_PATTERN.test(cleanLine)
  ) {
    return false;
  }

  if (cleanLine.length > 72 && /[.!?]/.test(cleanLine)) {
    return false;
  }

  return cleanLine.split(/\s+/).length <= 14;
};

// Converts noisy Wanderlog copied text into only the date/place lines that are
// useful for timeline construction.
const parseWanderlogCopiedLines = (
  rawLines: string[],
  kind: SourceLine['kind'],
  fallbackYear: number
): SourceLine[] | null => {
  const lines = rawLines.map(normalizeLine).filter(Boolean);

  if (!isLikelyWanderlogCopy(lines)) {
    return null;
  }

  const parsedLines: SourceLine[] = [];
  const seenPlaces = new Set<string>();
  let expectingPlace = false;
  let capturedHeaderLocation = false;
  let sawStopNumber = false;

  lines.forEach((line) => {
    const dateSignal = parseDateSignal(line, fallbackYear);

    if (dateSignal && !isWanderlogDateTimeOnlyLine(line)) {
      parsedLines.push({ line, kind });
      expectingPlace = false;
      return;
    }

    if (isStandaloneStopNumber(line)) {
      // The next meaningful row after a stop number is usually the place name.
      sawStopNumber = true;
      expectingPlace = true;
      return;
    }

    if (isWanderlogTravelLine(line)) {
      expectingPlace = true;
      return;
    }

    if (isWanderlogDateTimeOnlyLine(line) || isTimeOnlyLine(line)) {
      return;
    }

    const cleanPlace = cleanWanderlogPlaceLine(line);
    const headerLocation = !sawStopNumber && findLocationsInText(cleanPlace).some(
      (location) => location.countryId || location.countryName || location.stampId
    );

    if (headerLocation && !capturedHeaderLocation && isWanderlogPlaceNameLine(cleanPlace)) {
      parsedLines.push({ line: cleanPlace, kind });
      capturedHeaderLocation = true;
      return;
    }

    if (!expectingPlace && !/^to\s+/i.test(line)) {
      return;
    }

    if (!isWanderlogPlaceNameLine(cleanPlace)) {
      expectingPlace = false;
      return;
    }

    const placeKey = cleanPlace.toLowerCase();

    if (!seenPlaces.has(placeKey)) {
      parsedLines.push({ line: cleanPlace, kind });
      seenPlaces.add(placeKey);
    }

    expectingPlace = false;
  });

  return parsedLines.length ? parsedLines : null;
};

// Normalizes pasted text and uploaded-file text into one line stream. This is
// the parser boundary between raw import sources and structured itinerary logic.
const buildSourceLines = (text: string | undefined, files: TripImportFile[]): SourceLine[] => {
  const lines: SourceLine[] = [];
  const fallbackYear = new Date().getFullYear();

  if (text?.trim()) {
    const rawTextLines = text
      .split(/\r?\n/)
      .map(normalizeLine)
      .filter(Boolean);
    const wanderlogLines = parseWanderlogCopiedLines(rawTextLines, 'text', fallbackYear);

    if (wanderlogLines) {
      lines.push(...wanderlogLines);
    } else {
      rawTextLines.forEach((line) => lines.push({ line, kind: 'text' }));
    }
  }

  files.forEach((file) => {
    const extractedLines = file.extractedText
      ?.split(/\r?\n/)
      .map(normalizeLine)
      .filter(Boolean);

    if (extractedLines?.length) {
      const wanderlogLines = parseWanderlogCopiedLines(extractedLines, 'file', fallbackYear);

      if (wanderlogLines) {
        lines.push(...wanderlogLines);
      } else {
        extractedLines.forEach((line) => lines.push({ line, kind: 'file' }));
      }
      return;
    }

    const cleanName = cleanFileName(file.name);

    if (cleanName) {
      if (file.kind === 'pdf' && !findLocationsInText(cleanName).length && !/\b(?:itinerary|plan|trip|travel)\b/i.test(cleanName)) {
        return;
      }

      lines.push({
        line: file.kind === 'pdf' ? cleanName : `Screenshot: ${cleanName}`,
        kind: 'file',
      });
    }
  });

  return lines;
};

// Creates a timeline day shell from the current date/location signal. Activities
// are appended later after the line passes noise filters.
const createDay = (
  index: number,
  dateSignal: DateSignal | null,
  lineLocations: ParsedTripLocation[]
): ParsedTripDay => {
  const locationLabel = lineLocations[0]?.name;
  const dateLabel = dateSignal?.label;
  const titleParts = [`Day ${dateSignal?.dayNumber || index}`];

  if (dateLabel && !/^day\s+\d+/i.test(dateLabel)) {
    titleParts.push(dateLabel);
  }

  if (locationLabel) {
    titleParts.push(locationLabel);
  }

  return {
    id: createParserId('day'),
    title: titleParts.join(' / '),
    date: dateSignal?.iso,
    endDate: dateSignal?.endIso,
    originalDateText: dateSignal?.originalText,
    locations: lineLocations,
    activities: [],
  };
};

// Rebuilds a day title as more locations are discovered while scanning lines.
const updateDayTitle = (day: ParsedTripDay, index: number) => {
  const existingDayLabel = day.title.match(/^Day \d+/i)?.[0];
  const dateLabel =
    day.date && day.endDate
      ? `${formatIsoDate(day.date)} - ${formatIsoDate(day.endDate)}`
      : day.originalDateText && day.date
        ? formatIsoDate(day.date)
        : undefined;
  const titleParts = [existingDayLabel || `Day ${index}`];

  if (dateLabel) {
    titleParts.push(dateLabel);
  }

  if (day.locations[0]?.name) {
    titleParts.push(day.locations[0].name);
  }

  day.title = titleParts.join(' / ');
};

// De-duplicates locations by name and country so repeated itinerary mentions do
// not inflate the imported trip summary.
const mergeLocations = (current: ParsedTripLocation[], next: ParsedTripLocation[]) => {
  const byKey = new Map<string, ParsedTripLocation>();

  [...current, ...next].forEach((location) => {
    const key = `${location.name}:${location.countryId || location.countryName || ''}`;
    byKey.set(key, location);
  });

  return Array.from(byKey.values());
};

// Adds an activity only when the source line looks like an actual itinerary
// item rather than a heading, address, date, or standalone location.
const addActivityToDay = (
  day: ParsedTripDay,
  source: SourceLine,
  dateSignal: DateSignal | null,
  locations: ParsedTripLocation[]
) => {
  const title = cleanActivityTitle(source.line, dateSignal);
  const titleLikeLine =
    /\b(?:itinerary|travel plan)\b/i.test(title) ||
    (/\btrip\b/i.test(title) && !extractTime(source.line) && !dateSignal?.iso);

  if (
    !title ||
    titleLikeLine ||
    LOW_SIGNAL_LINE_PATTERN.test(source.line) ||
    ADDRESS_OR_HOURS_PATTERN.test(source.line) ||
    SECTION_HEADER_PATTERN.test(title) ||
    LOW_SIGNAL_LINE_PATTERN.test(title) ||
    ADDRESS_OR_HOURS_PATTERN.test(title) ||
    isLocationOnly(title, locations)
  ) {
    return;
  }

  const activity: ParsedTripActivity = {
    id: createParserId('activity'),
    title,
    date: dateSignal?.iso || day.date,
    time: extractTime(source.line),
    locationName: locations[0]?.name,
    sourceLine: source.line,
    sourceKind: source.kind,
  };

  day.activities.push(activity);
};

// Walks the normalized source lines and builds ordered trip days. A date, day
// marker, or first discovered location can start the first/new timeline day.
const buildTimeline = (sourceLines: SourceLine[], fallbackYear: number) => {
  const timeline: ParsedTripDay[] = [];
  let currentDay: ParsedTripDay | null = null;
  let pendingTime: string | undefined;

  sourceLines.forEach((rawSource) => {
    if (isTimeOnlyLine(rawSource.line)) {
      pendingTime = extractTime(rawSource.line);
      return;
    }

    // Some copied itineraries put the time on one line and the place/activity on
    // the next; carrying `pendingTime` preserves that useful schedule detail.
    const source =
      pendingTime && !extractTime(rawSource.line)
        ? {
            ...rawSource,
            line: `${pendingTime} ${rawSource.line}`,
          }
        : rawSource;
    pendingTime = undefined;
    const dateSignal = parseDateSignal(source.line, fallbackYear);
    const lineLocations = findLocationsInText(source.line);
    const explicitDay = /\bday\s+\d{1,2}\b/i.test(source.line);
    const startsNewDate = Boolean(dateSignal?.iso && currentDay?.date !== dateSignal.iso);
    const startsNewDay = explicitDay || startsNewDate || (!currentDay && Boolean(dateSignal || lineLocations.length));

    if (startsNewDay) {
      currentDay = createDay(timeline.length + 1, dateSignal, lineLocations);
      timeline.push(currentDay);
    }

    if (!currentDay) {
      currentDay = createDay(1, dateSignal, lineLocations);
      timeline.push(currentDay);
    }

    currentDay.locations = mergeLocations(currentDay.locations, lineLocations);
    updateDayTitle(currentDay, timeline.indexOf(currentDay) + 1);
    addActivityToDay(currentDay, source, dateSignal, lineLocations);
  });

  if (!timeline.length && sourceLines.length) {
    const firstLine = sourceLines[0];
    const firstLocations = findLocationsInText(firstLine.line);
    const fallbackDay = createDay(1, null, firstLocations);
    addActivityToDay(fallbackDay, firstLine, null, firstLocations);
    timeline.push(fallbackDay);
  }

  return timeline;
};

// Combines locations found during timeline parsing with locations found in the
// full raw text, catching places that only appear in headers or summaries.
const getAllLocations = (timeline: ParsedTripDay[], rawText: string) => {
  const allLocations = timeline.reduce<ParsedTripLocation[]>(
    (locations, day) => mergeLocations(locations, day.locations),
    []
  );

  return mergeLocations(allLocations, findLocationsInText(rawText));
};

// Chooses the country mentioned most often as the imported trip's primary
// country for journal metadata and passport stamp suggestions.
const getPrimaryCountry = (locations: ParsedTripLocation[]) => {
  const counts = new Map<string, { id?: string; name?: string; count: number }>();

  locations.forEach((location) => {
    const key = location.countryId || location.countryName;

    if (!key) {
      return;
    }

    const current = counts.get(key) || { id: location.countryId, name: location.countryName, count: 0 };
    counts.set(key, {
      id: current.id || location.countryId,
      name: current.name || location.countryName,
      count: current.count + 1,
    });
  });

  return Array.from(counts.values()).sort((first, second) => second.count - first.count)[0];
};

// Collapses timeline day dates into the trip-level range shown in import review.
const getDateRange = (timeline: ParsedTripDay[]) => {
  const starts = timeline
    .map((day) => day.date)
    .filter((date): date is string => Boolean(date))
    .sort();
  const ends = timeline
    .map((day) => day.endDate || day.date)
    .filter((date): date is string => Boolean(date))
    .sort();

  if (!starts.length) {
    return undefined;
  }

  const start = starts[0];
  const end = ends[ends.length - 1];

  return {
    start,
    end,
    label: start === end ? formatIsoDate(start) : `${formatIsoDate(start)} - ${formatIsoDate(end)}`,
  };
};

// Finds a reasonable trip title from explicit heading text, then falls back to
// country/location labels when the import does not include a title.
const getTitle = (rawText: string, primaryCountryName?: string, firstLocationName?: string) => {
  const firstLine = rawText.split(/\r?\n/).map(normalizeLine).find(Boolean);
  const explicitTitle = firstLine?.match(/\b(?:trip|itinerary|plan)\s+(?:to|for)\s+(.{3,48})/i);

  if (explicitTitle?.[1]) {
    return titleCase(explicitTitle[1].replace(/[|:,-].*$/, '').trim());
  }

  if (
    firstLine &&
    /\b(?:itinerary|travel plan|trip)\b/i.test(firstLine) &&
    !/\bday\s+\d{1,2}\b/i.test(firstLine)
  ) {
    const cleanedTitle = firstLine
      .replace(/\b(?:itinerary|travel plan|trip|wanderlog)\b/gi, '')
      .replace(/[|:,-]+$/g, '')
      .trim();

    if (cleanedTitle.length >= 3) {
      return titleCase(cleanedTitle);
    }
  }

  if (primaryCountryName) {
    return `Trip to ${primaryCountryName}`;
  }

  if (firstLocationName) {
    return `Trip to ${firstLocationName}`;
  }

  return 'Imported Trip';
};

// Creates lightweight tags from locations and common activity words so imported
// trips can be searched or summarized without additional AI work.
const getTags = (locations: ParsedTripLocation[], sourceLines: SourceLine[]) => {
  const tags = new Set<string>();

  locations.slice(0, 5).forEach((location) => tags.add(location.name.toLowerCase().replace(/\s+/g, '-')));

  sourceLines.forEach((source) => {
    const lowerLine = source.line.toLowerCase();
    ACTIVITY_KEYWORDS.forEach((keyword) => {
      if (lowerLine.includes(keyword)) {
        tags.add(keyword.replace(/\s+/g, '-'));
      }
    });
  });

  tags.add('imported-trip');

  return Array.from(tags).slice(0, 8);
};

// Maps parsed locations to available stamp ids for passport unlock suggestions.
const getPassportStampIds = (locations: ParsedTripLocation[]) =>
  Array.from(
    new Set(
      locations
        .map((location) => {
          if (location.stampId) {
            return location.stampId;
          }

          if (!location.countryName) {
            return undefined;
          }

          const normalized = normalizeCountryToStampId(location.countryName);
          return availableStampIds.has(normalized) ? normalized : undefined;
        })
        .filter((stampId): stampId is string => Boolean(stampId))
    )
  );

// Produces a simple confidence score based on how many useful signals the parser
// found. This is an explainability score, not a machine-learning probability.
const getConfidence = (
  rawText: string,
  timeline: ParsedTripDay[],
  locations: ParsedTripLocation[],
  files: TripImportFile[]
) => {
  const activityCount = timeline.reduce((count, day) => count + day.activities.length, 0);
  const dateCount = timeline.filter((day) => day.date || day.originalDateText).length;
  const textScore = rawText.length > 80 ? 18 : rawText.length > 20 ? 10 : 0;
  const fileScore = Math.min(12, files.length * 4);
  const activityScore = Math.min(24, activityCount * 5);
  const locationScore = Math.min(22, locations.length * 6);
  const dateScore = Math.min(20, dateCount * 7);

  return Math.min(96, 30 + textScore + fileScore + activityScore + locationScore + dateScore);
};

// Builds the small "what we detected" chips shown in the import review UI.
const getSourceSignals = (
  text: string | undefined,
  files: TripImportFile[],
  timeline: ParsedTripDay[],
  locations: ParsedTripLocation[]
): ParsedTripSourceSignal[] => {
  const signals: ParsedTripSourceSignal[] = [];
  const activityCount = timeline.reduce((count, day) => count + day.activities.length, 0);

  if (text?.trim()) {
    signals.push({
      id: createParserId('signal'),
      kind: 'text',
      label: 'Pasted itinerary',
      detail: `${text.trim().length} characters`,
    });
  }

  files.forEach((file) => {
    signals.push({
      id: createParserId('signal'),
      kind: file.kind,
      label: file.kind === 'pdf' ? 'PDF source' : 'Screenshot source',
      detail: file.name,
    });
  });

  if (timeline.some((day) => day.date || day.originalDateText)) {
    signals.push({
      id: createParserId('signal'),
      kind: 'date',
      label: 'Dates found',
      detail: `${timeline.filter((day) => day.date || day.originalDateText).length}`,
    });
  }

  if (locations.length) {
    signals.push({
      id: createParserId('signal'),
      kind: 'location',
      label: 'Locations found',
      detail: `${locations.length}`,
    });
  }

  if (activityCount) {
    signals.push({
      id: createParserId('signal'),
      kind: 'activity',
      label: 'Activities found',
      detail: `${activityCount}`,
    });
  }

  return signals;
};

// Generates a deterministic summary sentence for imported drafts before any AI
// polishing is involved.
const getSummary = (
  activityCount: number,
  dayCount: number,
  dateRangeLabel: string | undefined,
  locations: ParsedTripLocation[],
  primaryCountryName: string | undefined
) => {
  const locationNames = locations.slice(0, 3).map((location) => location.name);
  const where = primaryCountryName || locationNames.join(', ');
  const datePart = dateRangeLabel ? ` for ${dateRangeLabel}` : '';
  const placePart = where ? ` around ${where}` : '';

  return `Drafted ${activityCount || 1} planned memories across ${dayCount || 1} scrapbook page${
    dayCount === 1 ? '' : 's'
  }${datePart}${placePart}.`;
};

// Public parser entry point used by the import flow. It returns a complete draft
// object that the journal page can preview, edit, and save as a real entry.
export const parseTripItinerary = ({ text, files = [], now = new Date() }: TripParserInput): ParsedTripDraft => {
  const sourceLines = buildSourceLines(text, files);
  const rawText = sourceLines.map((source) => source.line).join('\n');
  const timeline = buildTimeline(sourceLines, now.getFullYear());
  const locations = getAllLocations(timeline, rawText);
  const primaryCountry = getPrimaryCountry(locations);
  const dateRange = getDateRange(timeline);
  const passportStampIds = getPassportStampIds(locations);
  const activityCount = timeline.reduce((count, day) => count + day.activities.length, 0);
  const title = getTitle(rawText, primaryCountry?.name, locations[0]?.name);
  const confidence = getConfidence(rawText, timeline, locations, files);

  return {
    id: createParserId('trip'),
    title,
    summary: getSummary(activityCount, timeline.length, dateRange?.label, locations, primaryCountry?.name),
    confidence,
    dateRange,
    primaryCountryId: primaryCountry?.id,
    primaryCountryName: primaryCountry?.name,
    passportStampIds,
    locations,
    timeline,
    tags: getTags(locations, sourceLines),
    mood: 'excited',
    sourceSignals: getSourceSignals(text, files, timeline, locations),
    sourceFiles: files,
    rawText,
    importedAt: now.toISOString(),
  };
};
