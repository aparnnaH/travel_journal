'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Badge } from '@/components/ui';
import AppHeader from '@/components/layout/AppHeader';
import PageShell from '@/components/layout/PageShell';
import WorldAtlas from '@/components/maps/world/WorldAtlas';
import CityExplorer from '@/components/maps/city/CityExplorer';
import { useMapStore } from '@/store/mapStore';
import { placeholderCountries } from '@/lib/placeholderData';
import { useAuthStore } from '@/store/authStore';
import { signOut } from '@/lib/supabase';

export default function MapPage() {
  const {
    visitedCountries,
    scratchPercentage,
    reset,
    addVisitedCountry,
    removeVisitedCountry,
    setScratchPercentage,
  } = useMapStore();

  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && user === null) {
      router.replace('/login');
    }
  }, [user, router, isLoading]);

  useEffect(() => {
    const percent = Math.round((visitedCountries.length / placeholderCountries.length) * 100);
    setScratchPercentage(percent);
  }, [visitedCountries, setScratchPercentage]);

  const selectedCountry = useMemo(
    () => placeholderCountries.find((country) => country.id === selectedCountryId) ?? null,
    [selectedCountryId]
  );

  const availableCountries = placeholderCountries.filter((country) => !visitedCountries.includes(country.id));
  const recentlyVisited = placeholderCountries.filter((country) => visitedCountries.includes(country.id));

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

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader />
      <PageShell
        title="World Atlas"
        description="Track your globe-trotting story with a world atlas, country discovery, and city-level exploration."
        actions={
          <Button variant="secondary" isLoading={signingOut} onClick={handleSignOut}>
            Sign Out
          </Button>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Card>
            <div className="flex flex-col gap-6">
              <WorldAtlas
                visitedCountries={visitedCountries}
                onToggleCountry={(id) =>
                  visitedCountries.includes(id) ? removeVisitedCountry(id) : addVisitedCountry(id)
                }
                onSelectCountry={(id) => setSelectedCountryId(id)}
              />

              <Card className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="gold">Atlas {scratchPercentage}% revealed</Badge>
                  <Badge>{visitedCountries.length} countries visited</Badge>
                </div>
                <p className="text-ink/70">
                  Click a country to unlock the detailed country explorer and start building your city memory map.
                </p>
                <Button variant="outline" onClick={() => reset()}>
                  Reset Atlas Progress
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

      <CityExplorer country={selectedCountry} onClose={() => setSelectedCountryId(null)} />
    </div>
  );
}
