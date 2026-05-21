import type { PassportStamp } from '@/types';
import { placeholderCountries } from '@/lib/placeholderData';

const stampDates = [
  '2024-05-12',
  '2024-08-24',
  '2025-02-10',
  '2025-06-18',
  '2025-09-03',
  '2026-01-14',
];

export function buildPassportStamps(visitedCountryIds: string[]) {
  return visitedCountryIds
    .map((countryId, index) => {
      const country = placeholderCountries.find((c) => c.id === countryId);
      if (!country) return null;

      return {
        id: `${country.id}-${index}`,
        userId: 'local',
        countryId: country.id,
        countryName: country.name,
        visitDate: stampDates[index % stampDates.length],
        stampImage: undefined,
        isCollected: true,
        collectedAt: stampDates[index % stampDates.length],
      } as PassportStamp;
    })
    .filter(Boolean) as PassportStamp[];
}
