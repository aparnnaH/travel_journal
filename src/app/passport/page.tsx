'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/layout/AppHeader';
import PageShell from '@/components/layout/PageShell';
import { Card, Badge } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { useMapStore } from '@/store/mapStore';
import { placeholderCountries } from '@/lib/placeholderData';
import { buildPassportStamps } from '@/lib/passportService';

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

  const stamps = buildPassportStamps(visitedCountries);

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader />
      <PageShell
        title="Passport"
        description="Your digital travel passport shows every stamped country and current journey progress."
      >
        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
          <Card>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-ink/60">Passport Summary</p>
                  <h2 className="text-3xl font-serif text-ink">{visitedCountries.length} stamps</h2>
                </div>
                <Badge variant="gold">Vintage</Badge>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="bg-cream/90">
                  <p className="text-sm uppercase tracking-[0.2em] text-ink/60">Traveler</p>
                  <p className="mt-2 text-lg font-semibold text-ink">{user.displayName ?? user.email}</p>
                </Card>
                <Card className="bg-cream/90">
                  <p className="text-sm uppercase tracking-[0.2em] text-ink/60">Countries</p>
                  <p className="mt-2 text-lg font-semibold text-ink">{visitedCountries.length}</p>
                </Card>
              </div>

              {stamps.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-gold/40 bg-white p-10 text-center text-ink/70">
                  No passport stamps yet. Visit a country on the map to start collecting stamps.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {stamps.map((stamp) => (
                    <div
                      key={stamp.id}
                      className="rounded-3xl border border-gold/30 bg-white p-5 shadow-soft"
                    >
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm text-ink/60">{stamp.countryId}</p>
                          <h3 className="text-xl font-semibold text-ink">{stamp.countryName}</h3>
                        </div>
                        <span className="text-xs uppercase tracking-[0.2em] text-gold-deep">Stamped</span>
                      </div>
                      <div className="mb-4 rounded-3xl border border-gold/20 bg-cream/90 p-4 text-center text-ink/70">
                        <span className="block text-2xl font-serif text-gold-deep">✸</span>
                        <span className="block text-sm uppercase tracking-[0.2em] text-ink/60 mt-2">{stamp.visitDate}</span>
                      </div>
                      <div className="text-sm text-ink/70">
                        This stamp marks your visit to {stamp.countryName}. Add a journal note in the Journal section to make it permanent.
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <h3 className="text-xl font-semibold mb-4">Passport Highlights</h3>
            <div className="space-y-4">
              <div className="rounded-3xl border border-gold/20 bg-white p-4">
                <p className="text-sm uppercase tracking-[0.2em] text-ink/60">Next stamp</p>
                <p className="mt-2 text-lg font-semibold text-ink">
                  {placeholderCountries.find((country) => !visitedCountries.includes(country.id))?.name ?? 'All countries visited'}
                </p>
              </div>
              <div className="rounded-3xl border border-gold/20 bg-white p-4">
                <p className="text-sm uppercase tracking-[0.2em] text-ink/60">Mood</p>
                <p className="mt-2 text-lg font-semibold text-ink">Reflective</p>
              </div>
            </div>
          </Card>
        </div>
      </PageShell>
    </div>
  );
}
