'use client';

import { useEffect } from 'react';
import { Compass } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { demoMapState, demoUser, enableDemoMode, seedDemoLocalContext } from '@/lib/demoMode';
import { useAuthStore } from '@/store/authStore';
import { useMapStore } from '@/store/mapStore';

// Demo mode is intentionally client-started: it creates no real
// Supabase session and resets all demo edits back to the curated seed data.
export default function DemoPage() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);
  const replaceMapState = useMapStore((state) => state.replaceMapState);

  useEffect(() => {
    enableDemoMode();
    seedDemoLocalContext({ reset: true });
    setLoading(false);
    setUser(demoUser);
    replaceMapState(demoMapState);
    router.replace('/dashboard');
  }, [replaceMapState, router, setLoading, setUser]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-6 text-ink">
      <div className="text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-gold/20 bg-white text-gold-deep shadow-sm">
          <Compass className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-serif font-semibold">Opening demo</h1>
        <p className="mt-2 text-sm text-ink/65">Temporary changes stay on this browser and never save to cloud storage.</p>
      </div>
    </main>
  );
}
