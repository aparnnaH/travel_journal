'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Badge } from '@/components/ui';
import AppHeader from '@/components/layout/AppHeader';
import PageShell from '@/components/layout/PageShell';
import ScratchMap from '@/components/map/ScratchMap';
import { useMapStore } from '@/store/mapStore';
import { placeholderCountries } from '@/lib/placeholderData';
import { useAuthStore } from '@/store/authStore';
import { signOut } from '@/lib/supabase';

export default function MapPage() {
  const { visitedCountries, scratchPercentage, reset, addVisitedCountry, removeVisitedCountry } =
    useMapStore();
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!isLoading && user === null) {
      router.replace('/login');
    }
  }, [user, router, isLoading]);

  if (isLoading || !user) {
    return null;
  }

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    logout();
    setSigningOut(false);
    router.push('/login');
  };

  const availableCountries = placeholderCountries.filter(
    (country) => !visitedCountries.includes(country.id)
  );

  const recentlyVisited = placeholderCountries.filter((country) =>
    visitedCountries.includes(country.id)
  );

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader />
      <PageShell
        title="Scratch Map"
        description="Track your globe-trotting story with a vintage scratch map, journal entries, and country milestones."
        actions={
          <Button variant="secondary" isLoading={signingOut} onClick={handleSignOut}>
            Sign Out
          </Button>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Card>
            <div className="flex flex-col gap-6">
              <ScratchMap
                visitedCountries={visitedCountries}
                onToggleCountry={(id) =>
                  visitedCountries.includes(id) ? removeVisitedCountry(id) : addVisitedCountry(id)
                }
              />

              <Card className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="gold">Scratched {scratchPercentage}%</Badge>
                  <Badge>{visitedCountries.length} countries visited</Badge>
                </div>
                <p className="text-ink/70">
                  Scratch off more countries as you visit them. Use the quick actions to simulate your next destination.
                </p>
                <Button variant="outline" onClick={() => reset()}>
                  Reset Map Progress
                </Button>
              </Card>
            </div>
          </Card>

          <div className="space-y-6">
            <Card>
              <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                {availableCountries.slice(0, 3).map((country) => (
                  <div key={country.id} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-ink">{country.name}</p>
                      <p className="text-sm text-ink/60">Tap to mark as visited.</p>
                    </div>
                    <Button size="sm" onClick={() => addVisitedCountry(country.id)}>
                      Visit
                    </Button>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h3 className="text-xl font-semibold mb-4">Visited Countries</h3>
              {recentlyVisited.length === 0 ? (
                <p className="text-ink/60">No countries visited yet.</p>
              ) : (
                <div className="space-y-3">
                  {recentlyVisited.map((country) => (
                    <div
                      key={country.id}
                      className="flex items-center justify-between rounded-2xl bg-cream p-3"
                    >
                      <span>{country.name}</span>
                      <Button size="sm" variant="outline" onClick={() => removeVisitedCountry(country.id)}>
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </PageShell>
    </div>
  );
}
