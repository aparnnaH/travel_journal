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

const decodePdfHexString = (value: string) => {
  const hex = value.replace(/[^0-9a-f]/gi, '');

  if (hex.length < 4 || hex.length % 2 !== 0) {
    return '';
  }

  if (hex.startsWith('FEFF') || hex.startsWith('feff')) {
    const codePoints: number[] = [];

    for (let index = 4; index + 3 < hex.length; index += 4) {
      codePoints.push(Number.parseInt(hex.slice(index, index + 4), 16));
    }

    return String.fromCodePoint(...codePoints);
  }

  const bytes = new Uint8Array(hex.length / 2);

  for (let index = 0; index < hex.length; index += 2) {
    bytes[index / 2] = Number.parseInt(hex.slice(index, index + 2), 16);
  }

  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
};

const decodePdfLiteralString = (value: string) =>
  value
    .replace(/^[(]|[)]$/g, '')
    .replace(/\\([nrtbf()\\])/g, (_, escaped: string) => {
      const escapes: Record<string, string> = {
        n: '\n',
        r: '\r',
        t: '\t',
        b: '',
        f: '',
        '(': '(',
        ')': ')',
        '\\': '\\',
      };

      return escapes[escaped] ?? escaped;
    })
    .replace(/\\([0-7]{1,3})/g, (_, octal: string) => String.fromCharCode(Number.parseInt(octal, 8)));

const titleCaseWords = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

const getPlaceTextFromUri = (uri: string) => {
  try {
    const url = new URL(uri);
    const segments = url.pathname.split('/').map(decodeURIComponent).filter(Boolean);
    const segment = segments.at(-1)?.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim();

    if (!segment || /^(?:amp|index|maps?|places?|search|travel)$/i.test(segment)) {
      return '';
    }

    return titleCaseWords(segment);
  } catch {
    return '';
  }
};

const isUsefulPdfLine = (line: string) => {
  const cleanLine = line.replace(/\s+/g, ' ').trim();
  const lowerLine = cleanLine.toLowerCase();
  const letters = cleanLine.match(/[a-z]/gi)?.length ?? 0;
  const hexCharacters = cleanLine.match(/[a-f0-9]/gi)?.length ?? 0;

  if (cleanLine.length < 3 || cleanLine.length > 160 || letters < 2) {
    return false;
  }

  if (/^[a-f0-9\s]{16,}$/i.test(cleanLine) || hexCharacters / cleanLine.length > 0.82) {
    return false;
  }

  if (
    /^(?:adobe|annots|applewebkit|charprocs|creator|encoding|endobj|endstream|extgstate|filter|font|identity|length|macintosh|mediabox|moddate|obj|ordering|pdf-\d(?:\.\d+)?|procset|producer|rect|registry|startxref|stream|subtype|title|trailer|type|uri|xref)$/i.test(cleanLine) ||
    /^\/?[a-z]\d+\s+\d+\s+\d+\s+r\b/i.test(cleanLine) ||
    /^\/?[a-z]+\s+\/?[a-z0-9.-]+/i.test(cleanLine) ||
    /^g[0-9a-f]+\s+\d+\s+\d+\s+r\b/i.test(cleanLine) ||
    /(?:applewebkit|creationdate|flateDecode|https?:\/\/|khtml|mozilla|producer|safari|skia|www\.|xref)/i.test(cleanLine) ||
    /(?:^|[\s/])(?:bm|ca|CA|lc|LJ|LW|ML|SA)\s+[\d.]+/.test(cleanLine)
  ) {
    return false;
  }

  if (
    lowerLine.includes('font') ||
    lowerLine.includes('normal') ||
    lowerLine.includes('chrome/') ||
    lowerLine.includes('macintosh;') ||
    lowerLine.includes('applewebkit')
  ) {
    return false;
  }

  return true;
};

const uniqueCleanPdfLines = (lines: string[]) =>
  Array.from(
    new Set(
      lines
        .map((line) => line.replace(/[\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim())
        .filter(isUsefulPdfLine)
    )
  );

const extractPdfText = async (file: File) => {
  const buffer = await readFileAsArrayBuffer(file);
  const rawText = new TextDecoder('iso-8859-1').decode(buffer);
  const searchableText = rawText
    .replace(/stream[\s\S]*?endstream/g, '\n')
    .replace(/\\r|\\n|\r|\n/g, '\n');
  const candidates: string[] = [];

  Array.from(searchableText.matchAll(/\/(?:Title|Subject|Keywords)\s*(\((?:\\.|[^\\)])*\)|<\s*[0-9a-f\s]{8,}\s*>)/gi)).forEach(
    (match) => {
      const value = match[1];
      candidates.push(value.startsWith('(') ? decodePdfLiteralString(value) : decodePdfHexString(value));
    }
  );

  Array.from(searchableText.matchAll(/\bFEFF(?:[0-9a-f]{4}){3,}\b/gi)).forEach((match) => {
    candidates.push(decodePdfHexString(match[0]));
  });

  Array.from(searchableText.matchAll(/\/URI\s*\(([^)]+)\)/gi)).forEach((match) => {
    const placeText = getPlaceTextFromUri(decodePdfLiteralString(`(${match[1]})`));

    if (placeText) {
      candidates.push(placeText);
    }
  });

  Array.from(searchableText.matchAll(/https?:\/\/[^\s)<>]+/gi)).forEach((match) => {
    const placeText = getPlaceTextFromUri(match[0]);

    if (placeText) {
      candidates.push(placeText);
    }
  });

  return uniqueCleanPdfLines(candidates)
    .slice(0, 40)
    .join('\n')
    .slice(0, 6000);
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
        const extractedText = await extractPdfText(file);

        return {
          ...baseFile,
          ...(extractedText ? { extractedText } : {}),
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
    countryId: trip.primaryCountryId || '',
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
