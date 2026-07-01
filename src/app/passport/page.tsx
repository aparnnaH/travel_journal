// Passport route wrapper.
// This route reads map state, computes unlocked stamp ids, handles ?stamp= deep
// links, and lazy-loads the heavier passport UI for better perceived loading.
'use client';

import React, { Suspense, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import AppHeader from '@/components/layout/AppHeader';
import PassportLoadingShell from '@/components/passport/PassportLoadingShell';
import { COUNTRY_STAMPS } from '@/data/stamps/countries';
import { normalizeCountryToStampId } from '@/lib/stamps/assets';
import { useAuthStore } from '@/store/authStore';
import { useMapStore } from '@/store/mapStore';

const PassportPageComponent = dynamic(() => import('@/components/passport/PassportPage'), {
  loading: () => <PassportLoadingShell />,
});

// Lightweight shell used while the dynamic passport UI loads.
function PassportRouteLoadingShell() {
  return (
    <div className="min-h-screen bg-cream">
      <AppHeader />
      <PassportLoadingShell />
    </div>
  );
}

// Contains the client-side route logic that depends on auth and URL search params.
function PassportRouteContent() {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const visitedCountries = useMapStore((state) => state.visitedCountries);
  const countryLabels = useMapStore((state) => state.countryLabels);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Protected client route guard.
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [router, user, isLoading]);

  if (isLoading || !user) {
    return <PassportRouteLoadingShell />;
  }

  const visitedStampKeys = new Set<string>();

  // Build every normalized key that could unlock a stamp: raw ids, labels, and
  // matched atlas ids all count.
  visitedCountries.forEach((countryId) => {
    visitedStampKeys.add(countryId.toUpperCase());
    visitedStampKeys.add(normalizeCountryToStampId(countryId));

    const countryLabel = countryLabels[countryId];
    if (countryLabel) {
      visitedStampKeys.add(countryLabel.toUpperCase());
      visitedStampKeys.add(normalizeCountryToStampId(countryLabel));
    }
  });

  // A stamp unlocks when any of its known ids/aliases match the visited map keys.
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
  // Query targeting lets /map send users directly to the stamp they revealed.
  const requestedStampId = searchParams.get('stamp');
  const targetStampId = COUNTRY_STAMPS.some((stamp) => stamp.id === requestedStampId) ? requestedStampId : null;
  const displayedUnlockedStampIds = targetStampId
    ? Array.from(new Set([...unlockedStampIds, targetStampId]))
    : unlockedStampIds;

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader />
      <PassportPageComponent
        key={targetStampId ?? 'passport'}
        initialUnlockedStamps={displayedUnlockedStampIds}
        initialTargetStampId={targetStampId}
      />
    </div>
  );
}

// Suspense is required because useSearchParams participates in client routing.
export default function PassportPage() {
  return (
    <Suspense fallback={<PassportRouteLoadingShell />}>
      <PassportRouteContent />
    </Suspense>
  );
}
