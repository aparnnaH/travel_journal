import {
  BOARD_FALLBACK_WIDTH,
  BOARD_HEIGHT,
  NOTE_HEIGHT,
  NOTE_WIDTH,
  PHOTO_WIDTH,
  clamp,
  createId,
  createScrapbookPage,
  getNoteHeightForText,
  getPhotoHeight,
  noteColors,
} from '@/lib/canvas/scrapbook';
import { parseTripItinerary } from '@/lib/trip-parser';
import type {
  PhotoAsset,
  ScrapbookDecorationItem,
  ScrapbookNoteItem,
  ScrapbookPageData,
  ScrapbookPhotoItem,
} from '@/lib/canvas/scrapbook';
import type {
  ParsedTripDay,
  ParsedTripDraft,
  TripImportFile,
  TripImportResult,
  TripJournalDraft,
} from '@/types/trips';

type CreateTripImportDraftInput = {
  itineraryText?: string;
  files?: File[];
  startPageNumber?: number;
  boardWidth?: number;
};

export const isSupportedTripImportFile = (file: File) =>
  file.type.startsWith('image/') || file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const readFileAsArrayBuffer = (file: File) =>
  new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });

const extractPdfText = async (file: File) => {
  const buffer = await readFileAsArrayBuffer(file);
  const rawText = new TextDecoder().decode(buffer);
  const candidates =
    rawText
      .replace(/\\r|\\n|\r|\n/g, '\n')
      .match(/[A-Za-z][A-Za-z0-9\s.,:;'"!?()&/@#-]{4,}/g) || [];
  const ignoredTerms = ['endobj', 'stream', 'xref', 'trailer', 'font', 'obj', 'pdf'];

  return Array.from(new Set(candidates))
    .map((candidate) => candidate.replace(/\s+/g, ' ').trim())
    .filter((candidate) => {
      const lower = candidate.toLowerCase();
      return candidate.length >= 5 && !ignoredTerms.some((term) => lower === term || lower.startsWith(`${term} `));
    })
    .slice(0, 80)
    .join('\n')
    .slice(0, 12000);
};

export const readTripImportFiles = async (files: File[] = []): Promise<TripImportFile[]> => {
  const supportedFiles = files.filter(isSupportedTripImportFile);

  return Promise.all(
    supportedFiles.map(async (file) => {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const baseFile = {
        id: createId(),
        name: file.name,
        kind: isPdf ? 'pdf' : 'image',
        mimeType: file.type,
        size: file.size,
      } satisfies Omit<TripImportFile, 'dataUrl' | 'extractedText'>;

      if (isPdf) {
        return {
          ...baseFile,
          extractedText: await extractPdfText(file),
        };
      }

      return {
        ...baseFile,
        dataUrl: await readFileAsDataUrl(file),
      };
    })
  );
};

export const createJournalDraftFromTrip = (trip: ParsedTripDraft): TripJournalDraft => {
  const daySections = trip.timeline.map((day) => {
    const activities = day.activities.length
      ? day.activities.map((activity) => `- ${activity.time ? `${activity.time} ` : ''}${activity.title}`).join('\n')
      : '- Imported source saved for this day';

    return `${day.title}\n${activities}`;
  });
  const stampLine = trip.passportStampIds.length
    ? `Passport stamps: ${trip.passportStampIds.join(', ')}`
    : 'Passport stamps: no matching stamp yet';
  const sourceLine = trip.sourceFiles.length
    ? `Sources: ${trip.sourceFiles.map((file) => file.name).join(', ')}`
    : 'Sources: pasted itinerary';

  return {
    title: trip.title,
    content: [trip.summary, ...daySections, stampLine, sourceLine].join('\n\n'),
    countryId: trip.primaryCountryId || trip.primaryCountryName || 'Imported Trip',
    mood: trip.mood,
    tags: trip.tags,
  };
};

const createImportedPhotoAssets = (trip: ParsedTripDraft): PhotoAsset[] =>
  trip.sourceFiles
    .filter((file) => file.kind === 'image' && file.dataUrl)
    .map((file) => ({
      id: createId(),
      src: String(file.dataUrl),
      alt: file.name,
      caption: file.name.replace(/\.[^/.]+$/, ''),
    }));

const getDayNoteText = (day: ParsedTripDay, trip: ParsedTripDraft) => {
  const activities = day.activities.length
    ? day.activities
        .map((activity) => `${activity.time ? `${activity.time} ` : ''}${activity.title}`)
        .join('\n')
    : trip.summary;

  return [day.title, activities].filter(Boolean).join('\n\n');
};

const createTimelineTape = (pageId: string, boardWidth: number): ScrapbookDecorationItem => ({
  id: `import-timeline-${pageId}`,
  type: 'decoration',
  kind: 'tape',
  label: '',
  color: '#b9935f',
  x: clamp(boardWidth / 2 - 3, 24, boardWidth - 32),
  y: 34,
  width: 6,
  height: BOARD_HEIGHT - 78,
  rotation: 0,
  zIndex: 0,
});

const createStampDecoration = (
  trip: ParsedTripDraft,
  day: ParsedTripDay,
  boardWidth: number,
  zIndex: number
): ScrapbookDecorationItem => {
  const label = trip.primaryCountryName || day.locations[0]?.countryName || day.locations[0]?.name || 'Passport';

  return {
    id: createId(),
    type: 'decoration',
    kind: 'sticker',
    label,
    color: '#2f6f6d',
    x: clamp(boardWidth - 132, 24, boardWidth - 118),
    y: 28,
    width: 96,
    height: 96,
    rotation: -7,
    zIndex,
  };
};

const createDayNote = (
  day: ParsedTripDay,
  trip: ParsedTripDraft,
  pageIndex: number,
  boardWidth: number,
  zIndex: number
): ScrapbookNoteItem => {
  const noteWidth = Math.min(340, Math.max(NOTE_WIDTH, boardWidth - 360));
  const text = getDayNoteText(day, trip);

  return {
    id: createId(),
    type: 'note',
    text,
    color: noteColors[pageIndex % noteColors.length],
    x: 38,
    y: 96,
    width: noteWidth,
    height: Math.max(NOTE_HEIGHT, getNoteHeightForText(text, noteWidth)),
    rotation: pageIndex % 2 === 0 ? -2 : 2,
    zIndex,
  };
};

const createPhotoItem = (
  asset: PhotoAsset,
  pageIndex: number,
  boardWidth: number,
  zIndex: number
): ScrapbookPhotoItem => {
  const width = Math.min(PHOTO_WIDTH, Math.max(148, boardWidth * 0.3));

  return {
    id: createId(),
    type: 'photo',
    src: asset.src,
    alt: asset.alt,
    caption: asset.caption,
    x: clamp(boardWidth - width - 42, 24, boardWidth - width - 24),
    y: 164 + (pageIndex % 2) * 26,
    width,
    height: getPhotoHeight(width),
    rotation: pageIndex % 2 === 0 ? 4 : -5,
    zIndex,
  };
};

const createFileTicket = (
  trip: ParsedTripDraft,
  boardWidth: number,
  zIndex: number
): ScrapbookDecorationItem | null => {
  const pdfCount = trip.sourceFiles.filter((file) => file.kind === 'pdf').length;

  if (!pdfCount) {
    return null;
  }

  return {
    id: createId(),
    type: 'decoration',
    kind: 'ticket',
    label: `${pdfCount} PDF${pdfCount === 1 ? '' : 's'}`,
    color: '#ffd8b5',
    x: clamp(boardWidth - 228, 24, boardWidth - 196),
    y: 498,
    width: 172,
    height: 78,
    rotation: 5,
    zIndex,
  };
};

export const createScrapbookPagesFromTrip = (
  trip: ParsedTripDraft,
  startPageNumber = 1,
  boardWidth = BOARD_FALLBACK_WIDTH
): ScrapbookPageData[] => {
  const imageAssets = createImportedPhotoAssets(trip);
  const layoutWidth = Math.max(360, boardWidth || BOARD_FALLBACK_WIDTH);
  const days = trip.timeline.length ? trip.timeline : [];

  if (!days.length) {
    const page = createScrapbookPage(startPageNumber);
    page.title = trip.title;
    page.template = 'diary';
    page.theme = 'kraft';
    page.items = [
      createDayNote(
        {
          id: createId(),
          title: trip.title,
          locations: trip.locations,
          activities: [],
        },
        trip,
        0,
        layoutWidth,
        1
      ),
    ];
    page.photoTray = imageAssets;
    return [page];
  }

  return days.map((day, index) => {
    const page = createScrapbookPage(startPageNumber + index);
    const photoAsset = imageAssets[index];
    const fileTicket = index === 0 ? createFileTicket(trip, layoutWidth, 5) : null;

    page.title = day.title;
    page.template = 'timeline';
    page.theme = index % 3 === 1 ? 'grid' : index % 3 === 2 ? 'botanical' : 'kraft';
    page.photoTray = index === 0 ? imageAssets : [];
    page.items = [
      createTimelineTape(page.id, layoutWidth),
      createDayNote(day, trip, index, layoutWidth, 2),
      createStampDecoration(trip, day, layoutWidth, 3),
      ...(photoAsset ? [createPhotoItem(photoAsset, index, layoutWidth, 4)] : []),
      ...(fileTicket ? [fileTicket] : []),
    ];

    return page;
  });
};

export const createTripImportDraft = async ({
  itineraryText,
  files = [],
  startPageNumber = 1,
  boardWidth = BOARD_FALLBACK_WIDTH,
}: CreateTripImportDraftInput): Promise<TripImportResult> => {
  const sourceFiles = await readTripImportFiles(files);
  const trip = parseTripItinerary({ text: itineraryText, files: sourceFiles });

  return {
    trip,
    journalDraft: createJournalDraftFromTrip(trip),
    scrapbookPages: createScrapbookPagesFromTrip(trip, startPageNumber, boardWidth),
    passportStampIds: trip.passportStampIds,
  };
};
