'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/layout/AppHeader';
import PassportPageComponent from '@/components/passport/PassportPage';
import { COUNTRY_STAMPS } from '@/data/stamps/countries';
import { normalizeCountryToStampId } from '@/lib/stamps/assets';
import { getAvailableStampIds } from '@/lib/stamps/utils';
import { useAuthStore } from '@/store/authStore';
import { useMapStore } from '@/store/mapStore';

export default function PassportPage() {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const visitedCountries = useMapStore((state) => state.visitedCountries);
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [router, user, isLoading]);

  if (isLoading || !user) {
    return null;
  }

  const availableStampIds = getAvailableStampIds(COUNTRY_STAMPS);
  const unlockedStampIds = visitedCountries
    .map((country) => normalizeCountryToStampId(country))
    .filter((id) => availableStampIds.has(id));

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader />
      <PassportPageComponent initialUnlockedStamps={unlockedStampIds} />
    </div>
  );
}
