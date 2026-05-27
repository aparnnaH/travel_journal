import type { StampAssetFormat } from '@/types/stamps';

export const STAMP_ASSET_PIPELINE = {
  root: '/stamps',
  countryArtworkPattern: '/stamps/countries/{stampId}.png',
  placeholderArtwork: '/stamps/countries/_placeholder.svg',
  acceptedFormats: ['svg', 'png'] satisfies StampAssetFormat[],
  transparentCanvas: true,
  recommendedSize: {
    width: 1024,
    height: 1024,
  },
  textureFolders: {
    textures: '/stamps/textures',
    countries: '/stamps/countries',
  },
};

export const STAMP_IMPORT_CHECKLIST = [
  'Export transparent SVG or PNG artwork.',
  'Name the file with the matching stamp id.',
  'Place country artwork in public/stamps/countries.',
  'Reference the asset in src/data/stamps/countries.ts metadata.',
  'Use overlay layers for paper fiber, ink bleed, cancellation, or worn edges.',
];
