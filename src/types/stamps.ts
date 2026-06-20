// Passport stamp catalog and rendering types.
// The static stamp data, renderer, and passport page all share these shapes.
export type StampShape = 'square' | 'circle' | 'hexagon' | 'diamond' | 'rounded-square' | 'organic';
export type StampRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type StampAssetFormat = 'svg' | 'png';
export type StampAssetRole = 'artwork' | 'texture' | 'overlay' | 'mask';
export type StampBlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'soft-light'
  | 'hard-light'
  | 'color-burn'
  | 'luminosity';
export type StampFinish = 'matte-ink' | 'debossed-ink' | 'foil-accent' | 'archival-paper';
export type StampInkLevel = 'faded' | 'balanced' | 'saturated';

export interface StampColor {
  primary: string;
  secondary: string;
  background: string;
  border: string;
}

export interface StampAsset {
  id: string;
  src: string;
  format: StampAssetFormat;
  role: StampAssetRole;
  alt: string;
  width?: number;
  height?: number;
  transparent_background: boolean;
  ai_ready?: boolean;
  prompt_hint?: string;
}

export interface StampTextureLayer {
  id: string;
  asset: StampAsset;
  opacity: number;
  blend_mode: StampBlendMode;
  rotation?: number;
  scale?: number;
  locked_visible?: boolean;
  unlocked_visible?: boolean;
}

export interface StampCancellationMark {
  label: string;
  code: string;
  date_label: string;
  rotation: number;
  opacity: number;
}

export interface StampVisualConfig {
  edition_name: string;
  serial: string;
  issued_by: string;
  paper_tone: string;
  finish: StampFinish;
  ink_level: StampInkLevel;
  ink_bleed: number;
  wear: number;
  emboss: number;
  rotation_jitter: number;
  cancellation: StampCancellationMark;
}

export interface CountryStamp {
  id: string;
  country_name: string;
  region: string;
  emoji: string;
  shape: StampShape;
  colors: StampColor;
  rarity: StampRarity;
  cultural_elements: string[];
  border_style: 'ornate' | 'simple' | 'dotted' | 'decorative';
  rotation_angle: number;
  asset: StampAsset;
  texture_layers: StampTextureLayer[];
  overlay_layers: StampTextureLayer[];
  visual: StampVisualConfig;
  atlas_ids?: string[];
  aliases?: string[];
  is_placeholder?: boolean;
  unlocked_date?: Date | null;
}

export interface PassportStats {
  total_stamps: number;
  unlocked_stamps: number;
  locked_stamps: number;
  completion_percentage: number;
  regions_visited: string[];
}
