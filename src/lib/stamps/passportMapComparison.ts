import { COUNTRY_STAMPS } from '@/data/stamps/countries';
import { findCountryStamp } from '@/lib/stamps/matching';
import type { CountryStamp } from '@/types/stamps';

export type MapStampMatch = {
  countryId: string;
  countryName: string;
  stamp: CountryStamp;
};

export type MapStampGap = {
  countryId: string;
  countryName: string;
};

export type PassportMapComparison = {
  matched: MapStampMatch[];
  missingStamps: MapStampGap[];
  stampsNotOnMap: CountryStamp[];
  unlockedStampIds: string[];
  mapCountryCount: number;
  stampCoveragePercent: number;
  passportCompletionPercent: number;
};

export function comparePassportStampsToMap({
  countryLabels,
  visitedCountries,
}: {
  countryLabels: Record<string, string>;
  visitedCountries: string[];
}): PassportMapComparison {
  const uniqueVisitedCountries = [...new Set(visitedCountries)];
  const matched: MapStampMatch[] = [];
  const missingStamps: MapStampGap[] = [];
  const unlockedStampIds = new Set<string>();

  uniqueVisitedCountries.forEach((countryId) => {
    const countryName = countryLabels[countryId] || countryId;
    const stamp = findCountryStamp(countryId, countryName);

    if (stamp) {
      matched.push({
        countryId,
        countryName,
        stamp,
      });
      unlockedStampIds.add(stamp.id);
      return;
    }

    missingStamps.push({
      countryId,
      countryName,
    });
  });

  const stampsNotOnMap = COUNTRY_STAMPS.filter((stamp) => !unlockedStampIds.has(stamp.id));
  const mapCountryCount = uniqueVisitedCountries.length;
  const stampCoveragePercent =
    mapCountryCount === 0 ? 0 : Math.round((matched.length / mapCountryCount) * 100);
  const passportCompletionPercent = Math.round((unlockedStampIds.size / COUNTRY_STAMPS.length) * 100);

  return {
    matched,
    missingStamps,
    stampsNotOnMap,
    unlockedStampIds: [...unlockedStampIds],
    mapCountryCount,
    stampCoveragePercent,
    passportCompletionPercent,
  };
}
