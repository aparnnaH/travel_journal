// Stamp asset pipeline configuration.
// This file documents the expected public asset paths and import checklist for
// adding new collectible passport stamp artwork.
import type { StampAssetFormat } from '@/types/stamps';

// Shared conventions used by stamp tooling and documentation. The UI expects
// country artwork to live under the public `/stamps` root with transparent art.
export const STAMP_ASSET_PIPELINE = {
  root: '/stamps',
  countryArtworkPattern: '/stamps/countries/{stampId}.png',
  placeholderArtwork: '/stamps/countries/placeholder.png',
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

// Human checklist for future stamp imports so generated or hand-drawn artwork
// lands in the same format the renderer expects.
export const STAMP_IMPORT_CHECKLIST = [
  'Export transparent SVG or PNG artwork.',
  'Name the file with the matching stamp id.',
  'Place country artwork in public/stamps/countries.',
  'Reference the asset in src/data/stamps/countries.ts metadata.',
  'Use overlay layers for paper fiber, ink bleed, cancellation, or worn edges.',
];
