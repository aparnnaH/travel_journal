export type ScrapbookBaseItem = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
};

export type ScrapbookPhotoItem = ScrapbookBaseItem & {
  type: 'photo';
  src: string;
  alt: string;
  caption: string;
};

export type ScrapbookNoteItem = ScrapbookBaseItem & {
  type: 'note';
  text: string;
  color: string;
};

export type ScrapbookDecorationKind = 'sticker' | 'tape' | 'pin' | 'paper' | 'ticket';

export type ScrapbookDecorationItem = ScrapbookBaseItem & {
  type: 'decoration';
  kind: ScrapbookDecorationKind;
  label: string;
  color: string;
};

export type ScrapbookItem = ScrapbookPhotoItem | ScrapbookNoteItem | ScrapbookDecorationItem;

export type PhotoAsset = {
  id: string;
  src: string;
  alt: string;
  caption: string;
};

export type DrawingPoint = {
  x: number;
  y: number;
};

export type DrawingStroke = {
  id: string;
  color: string;
  width: number;
  points: DrawingPoint[];
};

export type ScrapbookThemeId = 'kraft' | 'grid' | 'postcard' | 'botanical';
export type ScrapbookTemplateId = 'freeform' | 'polaroid-wall' | 'timeline' | 'collage' | 'postcard' | 'diary';

export type ScrapbookPageData = {
  id: string;
  title: string;
  theme: ScrapbookThemeId;
  template: ScrapbookTemplateId;
  items: ScrapbookItem[];
  drawings: DrawingStroke[];
  photoTray: PhotoAsset[];
};

export type ScrapbookTheme = {
  id: ScrapbookThemeId;
  label: string;
  backgroundColor: string;
  backgroundImage: string;
  backgroundSize: string;
};

export const PHOTO_WIDTH = 190;
export const PHOTO_HEIGHT = 246;
export const MIN_PHOTO_WIDTH = 126;
export const MAX_PHOTO_WIDTH = 360;
export const BOARD_HEIGHT = 620;
export const BOARD_FALLBACK_WIDTH = 720;
export const NOTE_WIDTH = 190;
export const NOTE_HEIGHT = 178;
export const MIN_NOTE_WIDTH = 170;
export const MAX_NOTE_WIDTH = 430;
export const MIN_NOTE_HEIGHT = 150;
export const MAX_NOTE_HEIGHT = BOARD_HEIGHT - 32;

export const noteColors = ['#fff2a8', '#dcecff', '#ffd8d2', '#dff5d6'];
export const drawingColors = ['#3D2B0E', '#8B6035', '#B5473A', '#2F6F6D'];

export const scrapbookThemes: ScrapbookTheme[] = [
  {
    id: 'kraft',
    label: 'Kraft',
    backgroundColor: '#f4e5bd',
    backgroundImage:
      'linear-gradient(rgba(61, 43, 14, 0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(61, 43, 14, 0.07) 1px, transparent 1px)',
    backgroundSize: '34px 34px',
  },
  {
    id: 'grid',
    label: 'Grid',
    backgroundColor: '#fff8ea',
    backgroundImage:
      'linear-gradient(rgba(47, 111, 109, 0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(47, 111, 109, 0.18) 1px, transparent 1px)',
    backgroundSize: '28px 28px',
  },
  {
    id: 'postcard',
    label: 'Postcard',
    backgroundColor: '#f8f0df',
    backgroundImage:
      'linear-gradient(90deg, transparent 0 58%, rgba(139, 96, 53, 0.28) 58% 58.4%, transparent 58.4%), repeating-linear-gradient(0deg, transparent 0 42px, rgba(139, 96, 53, 0.16) 43px, transparent 44px)',
    backgroundSize: '100% 100%, 100% 100%',
  },
  {
    id: 'botanical',
    label: 'Botanical',
    backgroundColor: '#eef3dd',
    backgroundImage:
      'radial-gradient(circle at 18px 18px, rgba(47, 111, 109, 0.22) 0 2px, transparent 3px), linear-gradient(rgba(61, 43, 14, 0.08) 1px, transparent 1px)',
    backgroundSize: '46px 46px, 100% 36px',
  },
];

export const templateLabels: Array<{ id: ScrapbookTemplateId; label: string }> = [
  { id: 'freeform', label: 'Freeform' },
  { id: 'polaroid-wall', label: 'Wall' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'collage', label: 'Collage' },
  { id: 'postcard', label: 'Postcard' },
  { id: 'diary', label: 'Diary' },
];

export const decorationOptions: Array<{ kind: ScrapbookDecorationKind; label: string; color: string }> = [
  { kind: 'tape', label: 'Tape', color: '#f0dfaa' },
  { kind: 'pin', label: 'Pin', color: '#b5473a' },
  { kind: 'paper', label: 'Paper', color: '#fff7ca' },
  { kind: 'ticket', label: 'Ticket', color: '#ffd8b5' },
  { kind: 'sticker', label: 'Stamp', color: '#c9dca8' },
];

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const getPhotoHeight = (width: number) => Math.round(width * 1.3);

export const getNoteHeightForText = (text: string, width = NOTE_WIDTH) => {
  const writableWidth = Math.max(120, width - 28);
  const charactersPerLine = Math.max(12, Math.floor(writableWidth / 11));
  const visualLines = text.split(/\r?\n/).reduce((lineCount, line) => {
    const cleanLine = line.trim();
    return lineCount + Math.max(1, Math.ceil(cleanLine.length / charactersPerLine));
  }, 0);

  return clamp(76 + visualLines * 30, MIN_NOTE_HEIGHT, MAX_NOTE_HEIGHT);
};

export const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const createScrapbookPage = (pageNumber: number, id = createId()): ScrapbookPageData => ({
  id,
  title: `Page ${pageNumber}`,
  theme: 'kraft',
  template: 'freeform',
  items: [],
  drawings: [],
  photoTray: [],
});

export const normalizeScrapbookPage = (
  page: Partial<ScrapbookPageData>,
  pageNumber: number
): ScrapbookPageData => ({
  id: page.id || createId(),
  title: page.title || `Page ${pageNumber}`,
  theme: page.theme || 'kraft',
  template: page.template || 'freeform',
  items: Array.isArray(page.items) ? page.items : [],
  drawings: Array.isArray(page.drawings) ? page.drawings : [],
  photoTray: Array.isArray(page.photoTray) ? page.photoTray : [],
});

export const getScrapbookItemLabel = (item: ScrapbookItem) => {
  if (item.type === 'photo') {
    return `Photo ${item.caption}`;
  }

  if (item.type === 'note') {
    return 'Memory note';
  }

  return `${item.label} sticker`;
};
