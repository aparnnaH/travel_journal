import {
  CountryStamp,
  StampAssetFormat,
  StampColor,
  StampRarity,
  StampShape,
  StampVisualConfig,
} from '@/types/stamps';
import {
  createCountryArtworkAsset,
  createStampLayer,
  createTextureAsset,
} from '@/lib/stamps/assets';

const paperFiber = createTextureAsset('paper-fiber', 'paper-fiber.svg', 'Subtle archival paper fiber');
const inkBleed = createTextureAsset('ink-bleed', 'ink-bleed.svg', 'Soft uneven ink bleed texture');
const wornEdge = createTextureAsset('worn-edge', 'worn-edge.svg', 'Worn passport stamp edge texture');
const cancellationRings = createTextureAsset(
  'cancellation-rings',
  'cancellation-rings.svg',
  'Layered passport cancellation rings',
);

const baseTextureLayers = [
  createStampLayer({
    id: 'paper-fiber-layer',
    asset: paperFiber,
    opacity: 0.38,
    blend_mode: 'multiply',
    scale: 1.04,
  }),
  createStampLayer({
    id: 'ink-bleed-layer',
    asset: inkBleed,
    opacity: 0.28,
    blend_mode: 'color-burn',
    rotation: -4,
    scale: 1.08,
  }),
];

const baseOverlayLayers = [
  createStampLayer({
    id: 'worn-edge-layer',
    asset: wornEdge,
    opacity: 0.46,
    blend_mode: 'multiply',
    scale: 1.02,
  }),
  createStampLayer({
    id: 'cancellation-ring-layer',
    asset: cancellationRings,
    opacity: 0.2,
    blend_mode: 'multiply',
    rotation: 8,
    scale: 0.98,
    locked_visible: false,
  }),
];

interface StampInput {
  id: string;
  country_name: string;
  region: string;
  emoji: string;
  shape: StampShape;
  colors: StampColor;
  rarity: StampRarity;
  cultural_elements: string[];
  border_style: CountryStamp['border_style'];
  rotation_angle: number;
  artwork_format?: StampAssetFormat;
  visual: StampVisualConfig;
  prompt_hint: string;
}

const createCountryStamp = ({
  prompt_hint,
  artwork_format = 'png',
  ...stamp
}: StampInput): CountryStamp => ({
  ...stamp,
  asset: createCountryArtworkAsset(stamp.id, stamp.country_name, prompt_hint, artwork_format),
  texture_layers: baseTextureLayers,
  overlay_layers: baseOverlayLayers,
});

export const COUNTRY_STAMPS: CountryStamp[] = [
  createCountryStamp({
    id: 'japan',
    country_name: 'Japan',
    region: 'Asia',
    emoji: '🇯🇵',
    shape: 'rounded-square',
    colors: {
      primary: '#9e1b32',
      secondary: '#d9a441',
      background: '#fff4e8',
      border: '#35261d',
    },
    rarity: 'rare',
    cultural_elements: ['torii gate', 'sakura blossoms', 'Mount Fuji'],
    border_style: 'decorative',
    rotation_angle: -2.4,
    prompt_hint:
      'Transparent SVG or PNG, vintage Japanese passport stamp, torii gate, Mount Fuji, sakura, imperfect red ink, worn edges.',
    visual: {
      edition_name: 'Sakura Transit Seal',
      serial: 'JP-1847',
      issued_by: 'Tokyo Field Office',
      paper_tone: '#fff1df',
      finish: 'debossed-ink',
      ink_level: 'saturated',
      ink_bleed: 0.72,
      wear: 0.38,
      emboss: 0.58,
      rotation_jitter: 0.8,
      cancellation: {
        label: 'Tokyo',
        code: 'HND',
        date_label: 'Arrived',
        rotation: -11,
        opacity: 0.45,
      },
    },
  }),
  createCountryStamp({
    id: 'france',
    country_name: 'France',
    region: 'Europe',
    emoji: '🇫🇷',
    shape: 'rounded-square',
    colors: {
      primary: '#1f4f8f',
      secondary: '#a67c2d',
      background: '#f6edda',
      border: '#273345',
    },
    rarity: 'epic',
    cultural_elements: ['Eiffel Tower', 'fleur-de-lis', 'Art Nouveau'],
    border_style: 'ornate',
    rotation_angle: 1.1,
    prompt_hint:
      'Transparent SVG or PNG, French vintage passport stamp, Eiffel silhouette, fleur-de-lis, Art Nouveau linework, blue ink, aged paper impression.',
    visual: {
      edition_name: 'Left Bank Entry Mark',
      serial: 'FR-2201',
      issued_by: 'Paris Bureau',
      paper_tone: '#f5ead1',
      finish: 'foil-accent',
      ink_level: 'balanced',
      ink_bleed: 0.58,
      wear: 0.31,
      emboss: 0.66,
      rotation_jitter: 0.4,
      cancellation: {
        label: 'Paris',
        code: 'CDG',
        date_label: 'Entree',
        rotation: 9,
        opacity: 0.38,
      },
    },
  }),
  createCountryStamp({
    id: 'canada',
    country_name: 'Canada',
    region: 'North America',
    emoji: '🇨🇦',
    shape: 'rounded-square',
    colors: {
      primary: '#b3212d',
      secondary: '#2f604d',
      background: '#f4f1e9',
      border: '#4d2d2e',
    },
    rarity: 'common',
    cultural_elements: ['maple leaf', 'pine trees', 'snow fields'],
    border_style: 'simple',
    rotation_angle: -0.7,
    prompt_hint:
      'Transparent SVG or PNG, Canadian collectible passport stamp, maple leaf, pine forest, winter postal mark, red ink, tactile worn border.',
    visual: {
      edition_name: 'Maple Customs Cachet',
      serial: 'CA-0904',
      issued_by: 'Northern Desk',
      paper_tone: '#f7efe3',
      finish: 'matte-ink',
      ink_level: 'balanced',
      ink_bleed: 0.49,
      wear: 0.42,
      emboss: 0.4,
      rotation_jitter: 0.6,
      cancellation: {
        label: 'Vancouver',
        code: 'YVR',
        date_label: 'Cleared',
        rotation: -7,
        opacity: 0.35,
      },
    },
  }),
  createCountryStamp({
    id: 'egypt',
    country_name: 'Egypt',
    region: 'Africa',
    emoji: '🇪🇬',
    shape: 'rounded-square',
    colors: {
      primary: '#8f3a21',
      secondary: '#c59b42',
      background: '#fbefd6',
      border: '#3a2a1c',
    },
    rarity: 'epic',
    cultural_elements: ['hieroglyphs', 'pyramids', 'scarab'],
    border_style: 'decorative',
    rotation_angle: 2.1,
    prompt_hint:
      'Transparent SVG or PNG, Egyptian passport stamp collectible, pyramids, scarab, tiny hieroglyphic border, sienna ink, antique archive texture.',
    visual: {
      edition_name: 'Nile Archive Seal',
      serial: 'EG-3019',
      issued_by: 'Cairo Registry',
      paper_tone: '#f8e7c5',
      finish: 'debossed-ink',
      ink_level: 'saturated',
      ink_bleed: 0.68,
      wear: 0.5,
      emboss: 0.62,
      rotation_jitter: 0.9,
      cancellation: {
        label: 'Cairo',
        code: 'CAI',
        date_label: 'Recorded',
        rotation: 13,
        opacity: 0.42,
      },
    },
  }),
  createCountryStamp({
    id: 'brazil',
    country_name: 'Brazil',
    region: 'South America',
    emoji: '🇧🇷',
    shape: 'rounded-square',
    colors: {
      primary: '#18724a',
      secondary: '#d5a82f',
      background: '#f8eedf',
      border: '#274b63',
    },
    rarity: 'uncommon',
    cultural_elements: ['carnival rhythm', 'tropical leaves', 'rainforest'],
    border_style: 'decorative',
    rotation_angle: -1.6,
    prompt_hint:
      'Transparent SVG or PNG, Brazilian travel stamp, tropical leafwork, carnival geometry, rainforest badge, green and gold ink, imperfect print.',
    visual: {
      edition_name: 'Rainforest Entry Badge',
      serial: 'BR-5520',
      issued_by: 'Rio Desk',
      paper_tone: '#f7ead9',
      finish: 'matte-ink',
      ink_level: 'balanced',
      ink_bleed: 0.55,
      wear: 0.34,
      emboss: 0.46,
      rotation_jitter: 0.7,
      cancellation: {
        label: 'Rio',
        code: 'GIG',
        date_label: 'Entrada',
        rotation: -9,
        opacity: 0.37,
      },
    },
  }),
  createCountryStamp({
    id: 'italy',
    country_name: 'Italy',
    region: 'Europe',
    emoji: '🇮🇹',
    shape: 'rounded-square',
    colors: {
      primary: '#2b6f4a',
      secondary: '#a83a32',
      background: '#faf0dc',
      border: '#302a20',
    },
    rarity: 'rare',
    cultural_elements: ['Roman columns', 'Renaissance seal', 'terracotta'],
    border_style: 'ornate',
    rotation_angle: 0.5,
    prompt_hint:
      'Transparent SVG or PNG, Italian vintage passport stamp, Roman column, Renaissance medallion, olive branch, green ink, terracotta accent.',
    visual: {
      edition_name: 'Grand Tour Medallion',
      serial: 'IT-1186',
      issued_by: 'Roma Archivio',
      paper_tone: '#f8e9cf',
      finish: 'archival-paper',
      ink_level: 'balanced',
      ink_bleed: 0.52,
      wear: 0.28,
      emboss: 0.52,
      rotation_jitter: 0.35,
      cancellation: {
        label: 'Roma',
        code: 'FCO',
        date_label: 'Visto',
        rotation: 7,
        opacity: 0.39,
      },
    },
  }),
  createCountryStamp({
    id: 'greece',
    country_name: 'Greece',
    region: 'Europe',
    emoji: '🇬🇷',
    shape: 'rounded-square',
    colors: {
      primary: '#245d8f',
      secondary: '#b48a3c',
      background: '#eef5f4',
      border: '#24364a',
    },
    rarity: 'rare',
    cultural_elements: ['Greek columns', 'meander pattern', 'olive branches'],
    border_style: 'decorative',
    rotation_angle: 1.8,
    prompt_hint:
      'Transparent SVG or PNG, Greek collectible passport stamp, column silhouette, meander border, olive branch, Aegean blue ink, distressed print.',
    visual: {
      edition_name: 'Aegean Port Seal',
      serial: 'GR-4072',
      issued_by: 'Athens Port Office',
      paper_tone: '#edf4ef',
      finish: 'debossed-ink',
      ink_level: 'balanced',
      ink_bleed: 0.5,
      wear: 0.33,
      emboss: 0.57,
      rotation_jitter: 0.5,
      cancellation: {
        label: 'Athens',
        code: 'ATH',
        date_label: 'Entry',
        rotation: -8,
        opacity: 0.4,
      },
    },
  }),
  createCountryStamp({
    id: 'mexico',
    country_name: 'Mexico',
    region: 'North America',
    emoji: '🇲🇽',
    shape: 'rounded-square',
    colors: {
      primary: '#a43d2d',
      secondary: '#2f7255',
      background: '#fff0d8',
      border: '#49322a',
    },
    rarity: 'uncommon',
    cultural_elements: ['Aztec geometry', 'marigolds', 'agave'],
    border_style: 'decorative',
    rotation_angle: -2.2,
    prompt_hint:
      'Transparent SVG or PNG, Mexico passport stamp, Aztec geometry, marigold petals, agave, warm red ink, scrapbook ephemera feel.',
    visual: {
      edition_name: 'Marigold Border Mark',
      serial: 'MX-7611',
      issued_by: 'Mexico City Desk',
      paper_tone: '#fde9c6',
      finish: 'matte-ink',
      ink_level: 'saturated',
      ink_bleed: 0.62,
      wear: 0.45,
      emboss: 0.44,
      rotation_jitter: 0.8,
      cancellation: {
        label: 'Mexico City',
        code: 'MEX',
        date_label: 'Entrada',
        rotation: 11,
        opacity: 0.41,
      },
    },
  }),
  createCountryStamp({
    id: 'thailand',
    country_name: 'Thailand',
    region: 'Asia',
    emoji: '🇹🇭',
    shape: 'rounded-square',
    colors: {
      primary: '#8f2f43',
      secondary: '#c6a34a',
      background: '#fff3df',
      border: '#26364d',
    },
    rarity: 'rare',
    cultural_elements: ['temple roof', 'lotus', 'gold leaf'],
    border_style: 'ornate',
    rotation_angle: 1.3,
    prompt_hint:
      'Transparent SVG or PNG, Thai passport stamp collectible, temple roofline, lotus, gold leaf details, deep rose ink, worn handmade stamp edges.',
    visual: {
      edition_name: 'Lotus Visa Cachet',
      serial: 'TH-6408',
      issued_by: 'Bangkok Registry',
      paper_tone: '#fcebd1',
      finish: 'foil-accent',
      ink_level: 'balanced',
      ink_bleed: 0.57,
      wear: 0.32,
      emboss: 0.64,
      rotation_jitter: 0.6,
      cancellation: {
        label: 'Bangkok',
        code: 'BKK',
        date_label: 'Admitted',
        rotation: -10,
        opacity: 0.39,
      },
    },
  }),
  createCountryStamp({
    id: 'iceland',
    country_name: 'Iceland',
    region: 'Europe',
    emoji: '🇮🇸',
    shape: 'rounded-square',
    colors: {
      primary: '#1f6677',
      secondary: '#7a3f82',
      background: '#eef6f3',
      border: '#26333b',
    },
    rarity: 'legendary',
    cultural_elements: ['aurora', 'glaciers', 'volcanic ridge'],
    border_style: 'simple',
    rotation_angle: -0.4,
    artwork_format: 'svg',
    prompt_hint:
      'Transparent SVG or PNG, Iceland legendary passport stamp, aurora bands, glacier peaks, volcanic ridge, teal ink, premium worn collectible.',
    visual: {
      edition_name: 'Aurora Expedition Mark',
      serial: 'IS-9910',
      issued_by: 'Reykjavik Office',
      paper_tone: '#edf4ef',
      finish: 'archival-paper',
      ink_level: 'faded',
      ink_bleed: 0.46,
      wear: 0.37,
      emboss: 0.5,
      rotation_jitter: 0.35,
      cancellation: {
        label: 'Reykjavik',
        code: 'KEF',
        date_label: 'Landed',
        rotation: 8,
        opacity: 0.34,
      },
    },
  }),
];

export const STAMP_REGIONS = ['Africa', 'Asia', 'Europe', 'North America', 'South America'];

export const RARITY_COLORS: Record<StampRarity, string> = {
  common: '#6f675c',
  uncommon: '#18724a',
  rare: '#245d8f',
  epic: '#7d3654',
  legendary: '#b68d32',
};
