import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import AppHeader from '@/components/layout/AppHeader';
import { HomeDeskSceneTwoPage } from '@/features/homeDeskSceneTwo';

export const metadata: Metadata = {
  title: 'Organized Travel Desk | Travel Journal',
  description: 'A third experimental Travel Journal homepage concept showing scattered memories becoming an organized dashboard.',
};

export default function HomeDeskSceneTwo() {
  // This experimental homepage concept is only for local design review; hide it
  // from deployed environments until it becomes an intentional public route.
  if (process.env.NODE_ENV !== 'development') {
    notFound();
  }

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader />
      <HomeDeskSceneTwoPage />
    </div>
  );
}
