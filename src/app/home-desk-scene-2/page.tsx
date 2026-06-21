import type { Metadata } from 'next';
import AppHeader from '@/components/layout/AppHeader';
import { HomeDeskSceneTwoPage } from '@/features/homeDeskSceneTwo';

export const metadata: Metadata = {
  title: 'Organized Travel Desk | Travel Journal',
  description: 'A third experimental Travel Journal homepage concept showing scattered memories becoming an organized dashboard.',
};

export default function HomeDeskSceneTwo() {
  return (
    <div className="min-h-screen bg-cream">
      <AppHeader />
      <HomeDeskSceneTwoPage />
    </div>
  );
}
