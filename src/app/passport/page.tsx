'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/layout/AppHeader';
import PassportPageComponent from '@/components/passport/PassportPage';
import { COUNTRY_STAMPS } from '@/data/stamps/countries';
import { normalizeCountryToStampId } from '@/lib/stamps/assets';
import { useAuthStore } from '@/store/authStore';
import { useMapStore } from '@/store/mapStore';

export default function PassportPage() {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const visitedCountries = useMapStore((state) => state.visitedCountries);
  const countryLabels = useMapStore((state) => state.countryLabels);
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [router, user, isLoading]);

  if (isLoading || !user) {
    return null;
  }

  const visitedStampKeys = new Set<string>();

  visitedCountries.forEach((countryId) => {
    visitedStampKeys.add(countryId.toUpperCase());
    visitedStampKeys.add(normalizeCountryToStampId(countryId));

    const countryLabel = countryLabels[countryId];
    if (countryLabel) {
      visitedStampKeys.add(countryLabel.toUpperCase());
      visitedStampKeys.add(normalizeCountryToStampId(countryLabel));
    }
  });

  const unlockedStampIds = COUNTRY_STAMPS.filter((stamp) => {
    if (visitedStampKeys.has(stamp.id) || visitedStampKeys.has(normalizeCountryToStampId(stamp.country_name))) {
      return true;
    }

    const atlasMatch = stamp.atlas_ids?.some(
      (atlasId) =>
        visitedStampKeys.has(atlasId.toUpperCase()) ||
        visitedStampKeys.has(normalizeCountryToStampId(atlasId)),
    );
    if (atlasMatch) return true;

    return stamp.aliases?.some(
      (alias) =>
        visitedStampKeys.has(alias.toUpperCase()) ||
        visitedStampKeys.has(normalizeCountryToStampId(alias)),
    );
  }).map((stamp) => stamp.id);

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader />
      <PassportPageComponent initialUnlockedStamps={unlockedStampIds} />
    </div>
  );
}
