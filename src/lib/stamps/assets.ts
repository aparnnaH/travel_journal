import type { CSSProperties } from 'react';
import type {
  CountryStamp,
  StampAsset,
  StampAssetFormat,
  StampAssetRole,
  StampBlendMode,
  StampTextureLayer,
} from '@/types/stamps';

export const STAMP_PUBLIC_ROOT = '/stamps';
export const SUPPORTED_STAMP_ASSET_FORMATS: StampAssetFormat[] = ['svg', 'png'];

export type StampCssVariables = CSSProperties & Record<`--${string}`, string | number>;

interface StampAssetInput {
  id: string;
  src: string;
  format: StampAssetFormat;
  role: StampAssetRole;
  alt: string;
  width?: number;
  height?: number;
  transparent_background?: boolean;
  ai_ready?: boolean;
  prompt_hint?: string;
}

interface StampLayerInput {
  id: string;
  asset: StampAsset;
  opacity?: number;
  blend_mode?: StampBlendMode;
  rotation?: number;
  scale?: number;
  locked_visible?: boolean;
  unlocked_visible?: boolean;
}

export const createStampAsset = ({
  transparent_background = true,
  ai_ready = true,
  ...asset
}: StampAssetInput): StampAsset => ({
  ...asset,
  transparent_background,
  ai_ready,
});

export const createCountryArtworkAsset = (
  stampId: string,
  countryName: string,
  promptHint: string,
): StampAsset =>
  createStampAsset({
    id: `${stampId}-artwork`,
    src: `${STAMP_PUBLIC_ROOT}/countries/${stampId}.svg`,
    format: 'svg',
    role: 'artwork',
    alt: `${countryName} collectible passport stamp artwork`,
    width: 1024,
    height: 1024,
    prompt_hint: promptHint,
  });

export const createTextureAsset = (id: string, fileName: string, alt: string): StampAsset =>
  createStampAsset({
    id,
    src: `${STAMP_PUBLIC_ROOT}/textures/${fileName}`,
    format: 'svg',
    role: 'texture',
    alt,
    width: 1024,
    height: 1024,
  });

export const createStampLayer = ({
  opacity = 0.5,
  blend_mode = 'multiply',
  rotation = 0,
  scale = 1,
  locked_visible = true,
  unlocked_visible = true,
  ...layer
}: StampLayerInput): StampTextureLayer => ({
  ...layer,
  opacity,
  blend_mode,
  rotation,
  scale,
  locked_visible,
  unlocked_visible,
});

export const getStampAssetPath = (stamp: CountryStamp): string => stamp.asset.src;

export const getStampLayerStyle = (layer: StampTextureLayer): StampCssVariables => ({
  opacity: layer.opacity,
  mixBlendMode: layer.blend_mode,
  transform: `rotate(${layer.rotation ?? 0}deg) scale(${layer.scale ?? 1})`,
});

export const getStampCssVariables = (stamp: CountryStamp, isLocked = false): StampCssVariables => ({
  '--stamp-primary': isLocked ? '#4b4a45' : stamp.colors.primary,
  '--stamp-secondary': isLocked ? '#777168' : stamp.colors.secondary,
  '--stamp-background': isLocked ? '#d8d1c4' : stamp.colors.background,
  '--stamp-paper': isLocked ? '#d8d1c4' : stamp.visual.paper_tone,
  '--stamp-border': isLocked ? '#6f675c' : stamp.colors.border,
  '--stamp-ink-bleed': stamp.visual.ink_bleed,
  '--stamp-wear': stamp.visual.wear,
  '--stamp-emboss': stamp.visual.emboss,
});

export const normalizeCountryToStampId = (country: string): string =>
  country
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
