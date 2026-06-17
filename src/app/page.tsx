'use client';

import AppHeader from '@/components/layout/AppHeader';
import { HeroSection, FeaturesSection } from '@/features/landing';

export default function Home() {
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <AppHeader />
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
      </main>
    </div>
  );
}
