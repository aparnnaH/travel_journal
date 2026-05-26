import type { ScrapbookPageData } from '@/lib/canvas/scrapbook';
import type { JournalEntry } from '@/types';

export type TripImportFileKind = 'image' | 'pdf';

export type TripImportFile = {
  id: string;
  name: string;
  kind: TripImportFileKind;
  mimeType: string;
  size: number;
  dataUrl?: string;
  extractedText?: string;
};

export type ParsedTripLocation = {
  id: string;
  name: string;
  countryId?: string;
  countryName?: string;
  stampId?: string;
  confidence: number;
  matchedText: string;
};

export type ParsedTripActivity = {
  id: string;
  title: string;
  description?: string;
  date?: string;
  time?: string;
  locationName?: string;
  sourceLine: string;
  sourceKind: 'text' | 'file';
};

export type ParsedTripDay = {
  id: string;
  title: string;
  date?: string;
  endDate?: string;
  originalDateText?: string;
  locations: ParsedTripLocation[];
  activities: ParsedTripActivity[];
};

export type ParsedTripSourceSignal = {
  id: string;
  kind: 'text' | 'image' | 'pdf' | 'date' | 'location' | 'activity';
  label: string;
  detail?: string;
};

export type ParsedTripDraft = {
  id: string;
  title: string;
  summary: string;
  confidence: number;
  dateRange?: {
    start?: string;
    end?: string;
    label: string;
  };
  primaryCountryId?: string;
  primaryCountryName?: string;
  passportStampIds: string[];
  locations: ParsedTripLocation[];
  timeline: ParsedTripDay[];
  tags: string[];
  mood: JournalEntry['mood'];
  sourceSignals: ParsedTripSourceSignal[];
  sourceFiles: TripImportFile[];
  rawText: string;
  importedAt: string;
};

export type TripJournalDraft = {
  title: string;
  content: string;
  countryId: string;
  mood: JournalEntry['mood'];
  tags: string[];
};

export type TripImportResult = {
  trip: ParsedTripDraft;
  journalDraft: TripJournalDraft;
  scrapbookPages: ScrapbookPageData[];
  passportStampIds: string[];
};
