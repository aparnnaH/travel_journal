'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/layout/AppHeader';
import PassportPageComponent from '@/components/passport/PassportPage';
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

  // Map visited countries to stamp IDs
  const unlockedStampIds = visitedCountries
    .map((country) => country.toLowerCase().replace(/\s+/g, '-'))
    .filter((id) => {
      const validIds = ['japan', 'france', 'canada', 'egypt', 'brazil', 'italy', 'greece', 'mexico', 'thailand', 'iceland'];
      return validIds.includes(id);
    });

  return (
    <div className="min-h-screen bg-white">
      <AppHeader />
      <PassportPageComponent initialUnlockedStamps={unlockedStampIds} />
    </div>
  );
}
