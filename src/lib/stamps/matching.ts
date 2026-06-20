// Stamp matching helper.
// Map state may store atlas ids, ISO-like codes, display names, or aliases; this
// helper centralizes the matching rules so map/passport/audit stay consistent.
import { COUNTRY_STAMPS } from '@/data/stamps/countries';
import { normalizeCountryToStampId } from '@/lib/stamps/assets';

// Returns the stamp metadata matching a map country id/name/code, if one exists.
export function findCountryStamp(countryId: string, countryName?: string, countryCode?: string) {
  const stampKeys = new Set<string>();

  [countryId, countryName, countryCode].forEach((countryKey) => {
    if (!countryKey) return;

    stampKeys.add(countryKey.toUpperCase());
    stampKeys.add(normalizeCountryToStampId(countryKey));
  });

  return COUNTRY_STAMPS.find((stamp) => {
    if (stampKeys.has(stamp.id) || stampKeys.has(normalizeCountryToStampId(stamp.country_name))) {
      return true;
    }

    const atlasMatch = stamp.atlas_ids?.some(
      (atlasId) =>
        stampKeys.has(atlasId.toUpperCase()) ||
        stampKeys.has(normalizeCountryToStampId(atlasId)),
    );
    if (atlasMatch) return true;

    return stamp.aliases?.some(
      (alias) =>
        stampKeys.has(alias.toUpperCase()) ||
        stampKeys.has(normalizeCountryToStampId(alias)),
    );
  });
}
