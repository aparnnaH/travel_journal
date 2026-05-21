'use client';

import React, { useEffect, useState } from 'react';
import AppHeader from '@/components/layout/AppHeader';
import PageShell from '@/components/layout/PageShell';
import { Card, Button } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { useMapStore } from '@/store/mapStore';
import { fetchJournalEntries } from '@/lib/journalService';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const visitedCountries = useMapStore((state) => state.visitedCountries);
  const router = useRouter();
  const [journalCount, setJournalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
      return;
    }

    if (!user) {
      return;
    }

    const loadJournal = async () => {
      setLoading(true);
      const response = await fetchJournalEntries(user.id);
      setLoading(false);
      if (response.success && response.data) {
        setJournalCount(response.data.length);
      }
    };

    loadJournal();
  }, [router, user, isLoading]);

  if (isLoading || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader />
      <PageShell
        title="Dashboard"
        description="A quick vintage dashboard for your travel habits, story count, and map progress."
      >
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="space-y-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-ink/60">Profile</p>
              <h2 className="text-2xl font-semibold text-ink mt-2">{user.displayName ?? user.email}</h2>
            </div>
            <p className="text-ink/70">Start your next entry or update your profile details.</p>
            <Button onClick={() => router.push('/profile')}>Edit profile</Button>
          </Card>

          <Card className="space-y-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-ink/60">Map Progress</p>
              <h2 className="text-3xl font-semibold text-ink mt-2">{visitedCountries.length}</h2>
            </div>
            <p className="text-ink/70">Countries scratched off on your travel map.</p>
            <Button variant="outline" onClick={() => router.push('/map')}>
              View map
            </Button>
          </Card>

          <Card className="space-y-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-ink/60">Journal Count</p>
              <h2 className="text-3xl font-semibold text-ink mt-2">{loading ? '…' : journalCount}</h2>
            </div>
            <p className="text-ink/70">Entries saved to your travel journal.</p>
            <Button variant="outline" onClick={() => router.push('/journal')}>
              View journal
            </Button>
          </Card>
        </div>
      </PageShell>
    </div>
  );
}
