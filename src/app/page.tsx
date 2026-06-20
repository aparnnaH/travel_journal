// Public landing page.
// The landing page uses the same AppHeader as authenticated pages so signed-in
// state and navigation stay consistent before the user enters the app.
'use client';

import AppHeader from '@/components/layout/AppHeader';
import { HeroSection, FeaturesSection } from '@/features/landing';

// Renders the marketing/home surface: header, hero, and feature preview area.
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
