export type StampShape = 'square' | 'circle' | 'hexagon' | 'diamond' | 'rounded-square' | 'organic';
export type StampRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface StampColor {
  primary: string;
  secondary: string;
  background: string;
  border: string;
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
  unlocked_date?: Date | null;
}

export interface PassportStats {
  total_stamps: number;
  unlocked_stamps: number;
  locked_stamps: number;
  completion_percentage: number;
  regions_visited: string[];
}
