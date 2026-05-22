import { CountryStamp, StampShape } from '@/types/stamps';

export const getStampClipPath = (shape: StampShape): string => {
  const clipPaths: Record<StampShape, string> = {
    square: 'none',
    circle: 'circle(50%)',
    hexagon: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
    diamond: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
    'rounded-square': 'none',
    organic: 'polygon(20% 0%, 80% 0%, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0% 80%, 0% 20%)',
  };
  return clipPaths[shape];
};

export const getStampBorderStyle = (stamp: CountryStamp): {
  borderStyle: string;
  borderWidth: string;
  borderColor: string;
  boxShadow?: string;
} => {
  const borderConfigs = {
    ornate: {
      borderStyle: 'double',
      borderWidth: '3px',
      borderColor: stamp.colors.border,
      boxShadow: `0 0 8px rgba(0,0,0,0.15), inset 0 0 8px rgba(0,0,0,0.05)`,
    },
    simple: {
      borderStyle: 'solid',
      borderWidth: '2px',
      borderColor: stamp.colors.border,
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    dotted: {
      borderStyle: 'dotted',
      borderWidth: '2px',
      borderColor: stamp.colors.border,
      boxShadow: 'none',
    },
    decorative: {
      borderStyle: 'solid',
      borderWidth: '3px',
      borderColor: stamp.colors.primary,
      boxShadow: `0 4px 10px rgba(0,0,0,0.12), inset 0 1px 3px rgba(255,255,255,0.2)`,
    },
  };

  return borderConfigs[stamp.border_style];
};

export const getCompletionPercentage = (unlockedCount: number, totalCount: number): number => {
  return Math.round((unlockedCount / totalCount) * 100);
};

export const sortStampsByRegion = (stamps: CountryStamp[]): Record<string, CountryStamp[]> => {
  return stamps.reduce(
    (acc, stamp) => {
      if (!acc[stamp.region]) {
        acc[stamp.region] = [];
      }
      acc[stamp.region].push(stamp);
      return acc;
    },
    {} as Record<string, CountryStamp[]>,
  );
};
